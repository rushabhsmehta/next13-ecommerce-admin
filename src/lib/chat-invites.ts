import prismadb from "@/lib/prismadb";
import { normalizePhoneNumber } from "@/lib/phone-utils";

export function normalizeInviteEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}

export function normalizeInvitePhone(value?: string | null): string | null {
  return normalizePhoneNumber(value)?.e164 ?? null;
}

export async function claimPendingChatInvitesForTravelUser(
  travelAppUserId: string
): Promise<number> {
  const user = await prismadb.travelAppUser.findUnique({
    where: { id: travelAppUserId },
    select: { id: true, email: true, phone: true, isApproved: true },
  });
  if (!user) return 0;

  const email = normalizeInviteEmail(user.email);
  const phone = normalizeInvitePhone(user.phone);
  const matchers = [
    email ? { invitedEmail: email } : null,
    phone ? { invitedPhone: phone } : null,
  ].filter(Boolean) as Array<{ invitedEmail: string } | { invitedPhone: string }>;

  if (matchers.length === 0) return 0;

  const invites = await prismadb.chatGroupInvite.findMany({
    where: {
      status: "PENDING",
      OR: matchers,
    },
    select: { id: true, chatGroupId: true, role: true },
  });

  if (invites.length === 0) return 0;

  await prismadb.$transaction(async (tx) => {
    for (const invite of invites) {
      await tx.chatGroupMember.upsert({
        where: {
          chatGroupId_travelAppUserId: {
            chatGroupId: invite.chatGroupId,
            travelAppUserId: user.id,
          },
        },
        create: {
          chatGroupId: invite.chatGroupId,
          travelAppUserId: user.id,
          role: invite.role,
          isActive: true,
          leftAt: null,
        },
        update: {
          role: invite.role,
          isActive: true,
          leftAt: null,
        },
      });

      await tx.chatGroupInvite.updateMany({
        where: { id: invite.id, status: "PENDING" },
        data: {
          status: "ACCEPTED",
          acceptedTravelAppUserId: user.id,
          acceptedAt: new Date(),
        },
      });
    }

    if (!user.isApproved) {
      await tx.travelAppUser.update({
        where: { id: user.id },
        data: { isApproved: true },
      });
    }
  });

  return invites.length;
}
