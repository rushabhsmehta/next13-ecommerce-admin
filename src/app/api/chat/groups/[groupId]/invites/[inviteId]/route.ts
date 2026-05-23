import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { resolveChatGroupManager } from "@/lib/chat-group-access";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ groupId: string; inviteId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const ctx = await resolveChatGroupManager(userId, params.groupId);
    if (!ctx) return jsonError("Only admins and operations staff can manage invites", 403);

    const invite = await prismadb.chatGroupInvite.findUnique({
      where: { id: params.inviteId },
    });
    if (!invite || invite.chatGroupId !== params.groupId) {
      return jsonError("Invite not found", 404);
    }
    if (invite.status !== "PENDING") {
      return jsonError("Only pending invites can be cancelled", 400);
    }

    const updated = await prismadb.chatGroupInvite.update({
      where: { id: invite.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    return NextResponse.json(updated);
  });
}
