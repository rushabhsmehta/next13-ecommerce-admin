import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/chat/groups/[groupId]/members - List group members
export async function GET(_req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
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

    const members = await prismadb.chatGroupMember.findMany({
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
    });

    return NextResponse.json({ members });
  });
}

// POST /api/chat/groups/[groupId]/members - Add a member (admin/ops only)
export async function POST(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
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
    const { travelAppUserId, role = "TOURIST" } = body;

    if (!travelAppUserId) {
      return jsonError("travelAppUserId is required", 400);
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
        ...(requestorMembership.role === "ADMIN" ? { role } : {}),
      },
      create: {
        chatGroupId: params.groupId,
        travelAppUserId,
        role,
      },
      include: {
        travelAppUser: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  });
}

// DELETE /api/chat/groups/[groupId]/members - Remove a member (admin/ops only)
export async function DELETE(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
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

    if (
      !requestorMembership ||
      !["ADMIN", "OPERATIONS"].includes(requestorMembership.role)
    ) {
      return jsonError("Only admins and operations staff can remove members", 403);
    }

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return jsonError("memberId is required", 400);
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
