import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// Soft "edit window" — admins can override.
const EDIT_WINDOW_MS = 15 * 60 * 1000;

type Ctx = {
  travelUserId: string;
  message: Awaited<ReturnType<typeof prismadb.chatMessage.findUnique>>;
  isAdmin: boolean;
  isOwner: boolean;
};

async function loadContext(
  req: Request,
  groupId: string,
  messageId: string
): Promise<{ ok: true; ctx: Ctx } | { ok: false; res: NextResponse }> {
  const userId = await getRequestClerkUserId(req);
  if (!userId) return { ok: false, res: jsonError("Unauthorized", 401) };

  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
  });
  if (!travelUser) return { ok: false, res: jsonError("User not found", 404) };

  const membership = await prismadb.chatGroupMember.findUnique({
    where: {
      chatGroupId_travelAppUserId: {
        chatGroupId: groupId,
        travelAppUserId: travelUser.id,
      },
    },
  });
  if (!membership || !membership.isActive) {
    return { ok: false, res: jsonError("Not a member of this group", 403) };
  }

  const message = await prismadb.chatMessage.findUnique({
    where: { id: messageId },
  });
  if (!message || message.chatGroupId !== groupId) {
    return { ok: false, res: jsonError("Message not found", 404) };
  }

  const isAdmin = membership.role === "ADMIN" || membership.role === "OPERATIONS";
  const isOwner = message.senderId === travelUser.id;

  return {
    ok: true,
    ctx: { travelUserId: travelUser.id, message, isAdmin, isOwner },
  };
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ groupId: string; messageId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const loaded = await loadContext(req, params.groupId, params.messageId);
    if (!loaded.ok) return loaded.res;
    const { message, isOwner, isAdmin, travelUserId } = loaded.ctx;
    if (!message) return jsonError("Message not found", 404);

    if (message.isDeleted) return jsonError("Message has been deleted", 410);

    const body = await req.json().catch(() => ({}));

    const hasContentEdit = typeof body.content === "string";
    const hasPinEdit = typeof body.isPinned === "boolean";
    const hasImportantEdit = typeof body.isImportant === "boolean";
    const hasAnnouncementEdit = typeof body.isAnnouncement === "boolean";

    if (!hasContentEdit && !hasPinEdit && !hasImportantEdit && !hasAnnouncementEdit) {
      return jsonError("No editable fields provided", 400);
    }

    const data: Record<string, unknown> = {};

    if (hasContentEdit) {
      if (!isOwner && !isAdmin) {
        return jsonError("You can only edit your own messages", 403);
      }
      if (message.messageType !== "TEXT") {
        return jsonError("Only text messages can be edited", 400);
      }
      if (!isAdmin) {
        const age = Date.now() - message.createdAt.getTime();
        if (age > EDIT_WINDOW_MS) {
          return jsonError("Edit window has expired", 403);
        }
      }
      const content = body.content.trim();
      if (!content) return jsonError("content is required", 400);
      if (content.length > 2000) return jsonError("content too long", 400);
      data.content = content;
      data.editedAt = new Date();
    }

    if (hasPinEdit || hasImportantEdit || hasAnnouncementEdit) {
      if (!isAdmin) {
        return jsonError("Only admins and operations staff can moderate messages", 403);
      }
    }

    if (hasPinEdit) {
      if (body.isPinned) {
        await prismadb.chatMessage.updateMany({
          where: { chatGroupId: params.groupId, isPinned: true },
          data: { isPinned: false, pinnedAt: null, pinnedById: null },
        });
        data.isPinned = true;
        data.pinnedAt = new Date();
        data.pinnedById = travelUserId;
      } else {
        data.isPinned = false;
        data.pinnedAt = null;
        data.pinnedById = null;
      }
    }

    if (hasImportantEdit) {
      data.isImportant = body.isImportant;
    }

    if (hasAnnouncementEdit) {
      data.isAnnouncement = body.isAnnouncement;
    }

    const updated = await prismadb.chatMessage.update({
      where: { id: message.id },
      data,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        pinnedBy: { select: { id: true, name: true } },
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

    return NextResponse.json(updated);
  });
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ groupId: string; messageId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const loaded = await loadContext(req, params.groupId, params.messageId);
    if (!loaded.ok) return loaded.res;
    const { message, isOwner, isAdmin } = loaded.ctx;
    if (!message) return jsonError("Message not found", 404);

    if (message.isDeleted) return NextResponse.json({ deleted: true }, { status: 200 });
    if (!isOwner && !isAdmin) {
      return jsonError("You can only delete your own messages", 403);
    }

    await prismadb.chatMessage.update({
      where: { id: message.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ deleted: true }, { status: 200 });
  });
}
