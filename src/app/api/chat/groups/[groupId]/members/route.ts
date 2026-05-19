import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { normalizeInviteEmail, normalizeInvitePhone } from "@/lib/chat-invites";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"] as const;

function safeRole(role: unknown, canPromoteToAdmin = false) {
  if (typeof role !== "string" || !VALID_ROLES.includes(role as any)) return "TOURIST";
  if (role === "ADMIN" && !canPromoteToAdmin) return "TOURIST";
  return role;
}

// GET /api/chat/groups/[groupId]/members - List group members
export async function GET(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    // Verify user is a member
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

    const [group, members, pendingInvites] = await Promise.all([
      prismadb.chatGroup.findUnique({
        where: { id: params.groupId },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          tourPackageQueryId: true,
          tourStartDate: true,
          tourEndDate: true,
        },
      }),
      prismadb.chatGroupMember.findMany({
        where: {
          chatGroupId: params.groupId,
          isActive: true,
        },
        include: {
          travelAppUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isApproved: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      }),
      prismadb.chatGroupInvite.findMany({
        where: { chatGroupId: params.groupId, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          invitedName: true,
          invitedEmail: true,
          invitedPhone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      group,
      members,
      pendingInvites,
      myRole: membership.role,
      notificationsMuted: membership.notificationsMuted,
    });
  });
}

// POST /api/chat/groups/[groupId]/members - Add a member (admin/ops only)
export async function POST(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    // Check if requester is admin/ops in this group
    const requestorMembership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });

    if (
      !requestorMembership ||
      !["ADMIN", "OPERATIONS"].includes(requestorMembership.role)
    ) {
      return jsonError("Only admins and operations staff can add members", 403);
    }

    const body = await req.json();
    const {
      travelAppUserId,
      role = "TOURIST",
      invitedName,
      invitedEmail,
      invitedPhone,
    } = body;

    if (!travelAppUserId && !invitedName) {
      return jsonError("travelAppUserId or invitedName is required", 400);
    }

    const resolvedRole = safeRole(role, requestorMembership.role === "ADMIN") as any;

    if (!travelAppUserId) {
      const email = normalizeInviteEmail(invitedEmail);
      const phone = normalizeInvitePhone(invitedPhone);
      if (!email && !phone) {
        return jsonError("A valid email or phone number is required for invites", 400);
      }

      const invite = await prismadb.chatGroupInvite.create({
        data: {
          chatGroupId: params.groupId,
          invitedName: String(invitedName).trim(),
          invitedEmail: email,
          invitedPhone: phone,
          role: resolvedRole,
          invitedBy: userId,
        },
      });

      return NextResponse.json({ invite }, { status: 201 });
    }

    const member = await prismadb.chatGroupMember.upsert({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId,
        },
      },
      update: {
        isActive: true,
        leftAt: null,
        // Only ADMIN can change roles on re-addition
        ...(requestorMembership.role === "ADMIN" ? { role: resolvedRole } : {}),
      },
      create: {
        chatGroupId: params.groupId,
        travelAppUserId,
        role: resolvedRole,
      },
      include: {
        travelAppUser: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
        },
      },
    });

    await prismadb.chatGroupInvite.updateMany({
      where: {
        chatGroupId: params.groupId,
        status: "PENDING",
        acceptedTravelAppUserId: null,
        OR: [
          { invitedEmail: normalizeInviteEmail(member.travelAppUser.email) ?? "" },
          { invitedPhone: normalizeInvitePhone(member.travelAppUser.phone) ?? "" },
        ],
      },
      data: {
        status: "ACCEPTED",
        acceptedTravelAppUserId: travelAppUserId,
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json(member, { status: 201 });
  });
}

// DELETE /api/chat/groups/[groupId]/members - Remove a member.
// Admin/ops can remove anyone; any active member can remove themselves (leave group).
export async function DELETE(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    const requestorMembership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });

    if (!requestorMembership || !requestorMembership.isActive) {
      return jsonError("Not a member of this group", 403);
    }

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("inviteId");
    if (inviteId) {
      if (!["ADMIN", "OPERATIONS"].includes(requestorMembership.role)) {
        return jsonError("Only admins and operations staff can cancel invites", 403);
      }
      await prismadb.chatGroupInvite.updateMany({
        where: { id: inviteId, chatGroupId: params.groupId, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    const memberId = searchParams.get("memberId") ?? travelUser.id;

    const isSelfLeave = memberId === travelUser.id;
    const isAdminOrOps = ["ADMIN", "OPERATIONS"].includes(requestorMembership.role);

    if (!isSelfLeave && !isAdminOrOps) {
      return jsonError("Only admins and operations staff can remove other members", 403);
    }

    await prismadb.chatGroupMember.update({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: memberId,
        },
      },
      data: { isActive: false, leftAt: new Date() },
    });

    return NextResponse.json({ success: true });
  });
}
