import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { sendChatMessagePush } from "@/lib/expo-push";
import { acceptMatchingChatInvites } from "@/lib/chat-invites";

export const dynamic = "force-dynamic";

function previewForPush(messageType: string, content: string | null | undefined): string {
  if (messageType === "TEXT") {
    const text = (content ?? "").trim();
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }
  switch (messageType) {
    case "IMAGE": return "📷 Photo";
    case "PDF": return "📄 PDF";
    case "FILE": return "📎 File";
    case "LOCATION": return "📍 Location";
    case "CONTACT": return "👤 Contact";
    case "TOUR_LINK": return "🧭 Tour link";
    default: return "";
  }
}

// GET /api/chat/groups/[groupId]/messages - Get messages for a chat group
export async function GET(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    void acceptMatchingChatInvites(prismadb, travelUser.id).catch((err) =>
      console.error("[CHAT_INVITES_ACCEPT]", err)
    );

    // Verify user is a member of this group
    const membership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return jsonError("Not a member of this group", 403);
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    // Whether to keep deleted rows (so the client can render a "deleted"
    // placeholder in place of an in-memory bubble it already has).
    const includeDeleted = searchParams.get("includeDeleted") === "1";

    const messages = await prismadb.chatMessage.findMany({
      where: {
        chatGroupId: params.groupId,
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            messageType: true,
            isDeleted: true,
            sender: { select: { id: true, name: true } },
          },
        },
        reads: {
          select: { travelAppUserId: true, readAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    // Lightweight reads summary so the wire format stays small.
    const enriched = items.map((m) => {
      const otherReaders = (m.reads ?? []).filter((r) => r.travelAppUserId !== m.senderId);
      return {
        ...m,
        readsCount: otherReaders.length,
        // Drop the full reads array from the payload; clients use readsCount only for now.
        reads: undefined,
      };
    });

    return NextResponse.json({
      messages: enriched.reverse(),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
      hasMore,
    });
  });
}

// POST /api/chat/groups/[groupId]/messages - Send a message
export async function POST(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    // Verify user is an approved, active member of this group
    const membership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return jsonError("Not a member of this group", 403);
    }

    if (!travelUser.isApproved) {
      return jsonError("Your account is pending approval", 403);
    }

    const body = await req.json();
    const {
      messageType = "TEXT",
      content,
      fileUrl,
      fileName,
      fileSize,
      latitude,
      longitude,
      contactName,
      contactPhone,
      tourPackageId,
      replyToId,
      isAnnouncement = false,
    } = body;

    const isStaff = membership.role === "ADMIN" || membership.role === "OPERATIONS";
    const announcement = isAnnouncement === true && isStaff;

    // If replyToId is provided, ensure it points at a non-deleted message in this group.
    let validReplyToId: string | null = null;
    if (typeof replyToId === "string" && replyToId.length > 0) {
      const parent = await prismadb.chatMessage.findUnique({
        where: { id: replyToId },
        select: { id: true, chatGroupId: true, isDeleted: true },
      });
      if (parent && parent.chatGroupId === params.groupId && !parent.isDeleted) {
        validReplyToId = parent.id;
      }
    }

    // Per-messageType validation
    switch (messageType) {
      case "TEXT":
        if (!content) return jsonError("Message content is required", 400);
        break;
      case "IMAGE":
      case "PDF":
      case "FILE":
        if (!fileUrl) return jsonError(`fileUrl is required for ${messageType} messages`, 400);
        break;
      case "LOCATION": {
        const missingCoords = latitude == null || longitude == null;
        if (missingCoords) return jsonError("latitude and longitude are required for LOCATION messages", 400);
        break;
      }
      case "CONTACT":
        if (!contactName) return jsonError("contactName is required for CONTACT messages", 400);
        break;
      case "TOUR_LINK":
        if (!tourPackageId) return jsonError("tourPackageId is required for TOUR_LINK messages", 400);
        break;
    }

    const message = await prismadb.chatMessage.create({
      data: {
        chatGroupId: params.groupId,
        senderId: travelUser.id,
        messageType,
        content,
        fileUrl,
        fileName,
        fileSize,
        latitude,
        longitude,
        contactName,
        contactPhone,
        tourPackageId,
        replyToId: validReplyToId,
        isAnnouncement: announcement,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            messageType: true,
            isDeleted: true,
            sender: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Update group's updatedAt
    const group = await prismadb.chatGroup.update({
      where: { id: params.groupId },
      data: { updatedAt: new Date() },
      select: { name: true },
    });

    // Fire-and-forget push fan-out. Don't block the response on it.
    void sendChatMessagePush({
      groupId: params.groupId,
      excludeTravelAppUserId: travelUser.id,
      payload: {
        groupId: params.groupId,
        messageId: message.id,
        senderName: message.sender?.name ?? travelUser.name,
        groupName: group.name,
        preview: previewForPush(messageType, content),
      },
    }).catch((err) => console.error("[CHAT_MESSAGE_PUSH] failed", err));

    return NextResponse.json(message, { status: 201 });
  });
}
