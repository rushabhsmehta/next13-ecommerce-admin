#!/usr/bin/env node
/**
 * Trigger a chat push for Rushabh's travel user by sending a message from another member.
 * Usage: node tools/trigger-chat-push-test.mjs [groupId]
 */
import { PrismaClient } from "@prisma/client";
import { sendChatMessagePush } from "../src/lib/expo-push.ts";

const prisma = new PrismaClient();
const RUSHABH_CLERK_ID = "user_3DfsdbyOqC7KfOgpmgWu7up9A3T";

async function main() {
  const rushabh = await prisma.travelAppUser.findUnique({
    where: { clerkUserId: RUSHABH_CLERK_ID },
    select: { id: true, name: true },
  });
  if (!rushabh) throw new Error("Rushabh travel user not found");

  const argGroupId = process.argv[2];
  let groupId = argGroupId;

  if (!groupId) {
    const membership = await prisma.chatGroupMember.findFirst({
      where: {
        travelAppUserId: rushabh.id,
        isActive: true,
        notificationsMuted: false,
      },
      select: { chatGroupId: true, chatGroup: { select: { name: true } } },
    });
    if (!membership) throw new Error("Rushabh is not in any active chat group");
    groupId = membership.chatGroupId;
    console.log(`Using group: ${membership.chatGroup.name} (${groupId})`);
  }

  const tokens = await prisma.mobilePushToken.findMany({
    where: {
      isActive: true,
      travelAppUserId: rushabh.id,
    },
    select: { expoPushToken: true },
  });
  console.log(`Active push tokens for Rushabh: ${tokens.length}`);
  for (const t of tokens) console.log(`  ${t.expoPushToken}`);

  if (tokens.length === 0) {
    console.log("\n❌ No push token registered — open the app, sign in, allow notifications.");
    process.exit(1);
  }

  const otherMember = await prisma.chatGroupMember.findFirst({
    where: {
      chatGroupId: groupId,
      isActive: true,
      travelAppUserId: { not: rushabh.id },
    },
    include: { travelAppUser: { select: { id: true, name: true } } },
  });

  const senderName = otherMember?.travelAppUser?.name ?? "Aagam Team";
  const senderId = otherMember?.travelAppUser?.id ?? rushabh.id;

  console.log(`\nSending test push (excluding sender ${senderId})...`);
  await sendChatMessagePush({
    groupId,
    excludeTravelAppUserId: senderId,
    payload: {
      groupId,
      messageId: `test-${Date.now()}`,
      senderName,
      groupName: "Push Test",
      preview: "This is a push notification test — please check your phone!",
    },
  });
  console.log("✅ Push fan-out completed. Check your phone.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
