import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"] as const;
type Role = (typeof VALID_ROLES)[number];

// PATCH /api/chat/groups/[groupId]/members/[memberId] - Change a member's role.
// memberId here is the TravelAppUser.id (matching how DELETE works).
export async function PATCH(
  req: Request,
  props: { params: Promise<{ groupId: string; memberId: string }> }
) {
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
    // Only ADMIN can change roles. OPERATIONS can add/remove but not promote.
    if (requestorMembership.role !== "ADMIN") {
      return jsonError("Only admins can change member roles", 403);
    }

    const body = await req.json().catch(() => ({}));
    const role = body.role as string | undefined;
    if (!role || !VALID_ROLES.includes(role as Role)) {
      return jsonError(
        `role must be one of: ${VALID_ROLES.join(", ")}`,
        400
      );
    }

    // Prevent the last ADMIN from demoting themselves (would lock the group).
    if (
      params.memberId === travelUser.id &&
      requestorMembership.role === "ADMIN" &&
      role !== "ADMIN"
    ) {
      const otherAdmins = await prismadb.chatGroupMember.count({
        where: {
          chatGroupId: params.groupId,
          isActive: true,
          role: "ADMIN",
          travelAppUserId: { not: travelUser.id },
        },
      });
      if (otherAdmins === 0) {
        return jsonError(
          "Cannot demote the last admin. Promote another member first.",
          400
        );
      }
    }

    const updated = await prismadb.chatGroupMember.update({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: params.memberId,
        },
      },
      data: { role: role as Role },
      include: {
        travelAppUser: {
          select: { id: true, name: true, email: true, avatarUrl: true, isApproved: true },
        },
      },
    });

    return NextResponse.json({ member: updated });
  });
}
