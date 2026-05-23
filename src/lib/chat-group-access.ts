import type { ChatMemberRole } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

type TravelUserRow = {
  id: string;
  name: string;
  email: string;
};

export type ChatGroupManagerContext = {
  travelUser: TravelUserRow;
  membershipRole: ChatMemberRole | null;
  isOrgAdmin: boolean;
};

/**
 * Clerk users who may manage group invites: group ADMIN/OPERATIONS, or org ADMIN/OWNER.
 */
export async function resolveChatGroupManager(
  clerkUserId: string,
  groupId: string
): Promise<ChatGroupManagerContext | null> {
  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: clerkUserId },
    select: { id: true, name: true, email: true },
  });
  if (!travelUser) return null;

  const orgRole = await getUserOrgRole(clerkUserId);
  const isOrgAdmin = roleAtLeast(orgRole, "ADMIN");

  const membership = await prismadb.chatGroupMember.findUnique({
    where: {
      chatGroupId_travelAppUserId: {
        chatGroupId: groupId,
        travelAppUserId: travelUser.id,
      },
    },
    select: { role: true, isActive: true },
  });

  const isGroupStaff =
    membership?.isActive === true &&
    (membership.role === "ADMIN" || membership.role === "OPERATIONS");

  if (!isOrgAdmin && !isGroupStaff) return null;

  return {
    travelUser,
    membershipRole: membership?.isActive ? membership.role : null,
    isOrgAdmin,
  };
}
