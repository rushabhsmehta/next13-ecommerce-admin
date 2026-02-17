import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/chat/groups/[groupId]/messages - Get messages for a chat group
export async function GET(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

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

    const messages = await prismadb.chatMessage.findMany({
      where: {
        chatGroupId: params.groupId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    return NextResponse.json({
      messages: items.reverse(),
      nextCursor: hasMore ? items[0]?.id : null,
      hasMore,
    });
  });
}

// POST /api/chat/groups/[groupId]/messages - Send a message
export async function POST(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  return handleApi(async () => {
    const { userId } = auth();
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
    } = body;

    if (messageType === "TEXT" && !content) {
      return jsonError("Message content is required", 400);
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
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Update group's updatedAt
    await prismadb.chatGroup.update({
      where: { id: params.groupId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  });
}
