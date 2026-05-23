import type { ChatMemberRole, PrismaClient } from "@prisma/client";
import { normalizePhoneNumber } from "@/lib/phone-utils";

type Db = Pick<
  PrismaClient,
  "chatGroupInvite" | "chatGroupMember" | "travelAppUser"
>;

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

function normalizeInvitePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhoneNumber(phone);
  return normalized?.e164 ?? (phone.trim() || null);
}

export function normalizeInviteContact(input: {
  invitedEmail?: string | null;
  invitedPhone?: string | null;
}) {
  return {
    invitedEmail: normalizeEmail(input.invitedEmail),
    invitedPhone: normalizeInvitePhone(input.invitedPhone),
  };
}

export async function acceptMatchingChatInvites(
  db: Db,
  travelAppUserId: string
): Promise<number> {
  const user = await db.travelAppUser.findUnique({
    where: { id: travelAppUserId },
    select: { id: true, email: true, phone: true },
  });
  if (!user) return 0;

  const email = normalizeEmail(user.email);
  const phone = normalizeInvitePhone(user.phone);
  if (!email && !phone) return 0;

  const invites = await db.chatGroupInvite.findMany({
    where: {
      status: "PENDING",
      OR: [
        ...(email ? [{ invitedEmail: email }] : []),
        ...(phone ? [{ invitedPhone: phone }] : []),
      ],
    },
    select: {
      id: true,
      chatGroupId: true,
      role: true,
    },
  });

  if (invites.length === 0) return 0;

  const now = new Date();
  for (const invite of invites) {
    await db.chatGroupMember.upsert({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: invite.chatGroupId,
          travelAppUserId: user.id,
        },
      },
      update: {
        isActive: true,
        leftAt: null,
        role: invite.role,
      },
      create: {
        chatGroupId: invite.chatGroupId,
        travelAppUserId: user.id,
        role: invite.role,
      },
    });

    await db.chatGroupInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedTravelAppUserId: user.id,
        acceptedAt: now,
      },
    });
  }

  return invites.length;
}

export async function createChatGroupInvite(
  db: Db,
  input: {
    chatGroupId: string;
    invitedName: string;
    invitedEmail?: string | null;
    invitedPhone?: string | null;
    role?: ChatMemberRole;
    invitedBy: string;
  }
) {
  const name = input.invitedName.trim();
  if (!name) throw new Error("INVITE_NAME_REQUIRED");

  const { invitedEmail, invitedPhone } = normalizeInviteContact(input);
  if (!invitedEmail && !invitedPhone) {
    throw new Error("INVITE_CONTACT_REQUIRED");
  }

  const duplicate = await db.chatGroupInvite.findFirst({
    where: {
      chatGroupId: input.chatGroupId,
      status: "PENDING",
      OR: [
        ...(invitedEmail ? [{ invitedEmail }] : []),
        ...(invitedPhone ? [{ invitedPhone }] : []),
      ],
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("INVITE_ALREADY_PENDING");

  return db.chatGroupInvite.create({
    data: {
      chatGroupId: input.chatGroupId,
      invitedName: name,
      invitedEmail,
      invitedPhone,
      role: input.role ?? "TOURIST",
      invitedBy: input.invitedBy,
    },
  });
}
