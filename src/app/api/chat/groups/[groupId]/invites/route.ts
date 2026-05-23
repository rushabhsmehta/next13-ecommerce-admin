import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { createChatGroupInvite } from "@/lib/chat-invites";
import { resolveChatGroupManager } from "@/lib/chat-group-access";
import type { ChatMemberRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const ROLES: ChatMemberRole[] = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"];

export async function GET(
  req: Request,
  props: { params: Promise<{ groupId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const ctx = await resolveChatGroupManager(userId, params.groupId);
    if (!ctx) return jsonError("Only admins and operations staff can view invites", 403);

    const invites = await prismadb.chatGroupInvite.findMany({
      where: { chatGroupId: params.groupId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invitedName: true,
        invitedEmail: true,
        invitedPhone: true,
        role: true,
        status: true,
        createdAt: true,
        invitedByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ invites });
  });
}

export async function POST(
  req: Request,
  props: { params: Promise<{ groupId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const ctx = await resolveChatGroupManager(userId, params.groupId);
    if (!ctx) return jsonError("Only admins and operations staff can invite members", 403);

    const body = await req.json().catch(() => ({}));
    const invitedName = typeof body.invitedName === "string" ? body.invitedName : "";
    const invitedEmail =
      typeof body.invitedEmail === "string" ? body.invitedEmail : null;
    const invitedPhone =
      typeof body.invitedPhone === "string" ? body.invitedPhone : null;
    const role =
      typeof body.role === "string" && ROLES.includes(body.role as ChatMemberRole)
        ? (body.role as ChatMemberRole)
        : "TOURIST";

    if (ctx.membershipRole !== "ADMIN" && !ctx.isOrgAdmin && role === "ADMIN") {
      return jsonError("Only admins can invite with the admin role", 403);
    }

    try {
      const invite = await createChatGroupInvite(prismadb, {
        chatGroupId: params.groupId,
        invitedName,
        invitedEmail,
        invitedPhone,
        role,
        invitedBy: ctx.travelUser.id,
      });
      return NextResponse.json(invite, { status: 201 });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "INVITE_NAME_REQUIRED") {
        return jsonError("invitedName is required", 400);
      }
      if (code === "INVITE_CONTACT_REQUIRED") {
        return jsonError("invitedEmail or invitedPhone is required", 400);
      }
      if (code === "INVITE_ALREADY_PENDING") {
        return jsonError("A pending invite already exists for this contact", 409);
      }
      throw err;
    }
  });
}
