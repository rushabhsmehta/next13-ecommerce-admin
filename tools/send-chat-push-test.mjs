#!/usr/bin/env node
/**
 * Send a test chat push to Rushabh (or any user with an active token in a group).
 * Simulates another member posting a message — triggers sendChatMessagePush().
 *
 * Usage: node tools/send-chat-push-test.mjs [groupId]
 */
import { PrismaClient } from "@prisma/client";
import { sendChatMessagePush } from "../src/lib/expo-push.js";

const prisma = new PrismaClient();
const GROUP_ID = process.argv[2] ?? "98b440da-8e3e-4c81-8118-34a140e6c4b5";

const group = await prisma.chatGroup.findUnique({
  where: { id: GROUP_ID },
  select: { id: true, name: true },
});
if (!group) {
  console.error("Group not found:", GROUP_ID);
  process.exit(1);
}

// Pick a member who has an active push token; send as someone else in the group.
const members = await prisma.chatGroupMember.findMany({
  where: { chatGroupId: GROUP_ID, isActive: true },
  include: {
    travelAppUser: {
      select: {
        id: true,
        name: true,
        mobilePushTokens: { where: { isActive: true }, select: { expoPushToken: true } },
      },
    },
  },
});

const recipient = members.find((m) => m.travelAppUser.mobilePushTokens.length > 0);
if (!recipient) {
  console.error("No group member has an active push token yet.");
  console.error("Sign in on the phone, allow notifications, then reopen the app.");
  process.exit(1);
}

const sender = members.find((m) => m.travelAppUserId !== recipient.travelAppUserId);
const senderId = sender?.travelAppUserId ?? recipient.travelAppUserId;
const senderName = sender?.travelAppUser.name ?? "Aagam Team";

console.log(`Group: ${group.name}`);
console.log(`Recipient: ${recipient.travelAppUser.name}`);
console.log(`Token: ${recipient.travelAppUser.mobilePushTokens[0].expoPushToken}`);

await sendChatMessagePush({
  groupId: GROUP_ID,
  excludeTravelAppUserId: senderId,
  payload: {
    groupId: GROUP_ID,
    messageId: `manual-test-${Date.now()}`,
    senderName,
    groupName: group.name,
    preview: "Test push — if you see this, notifications work!",
  },
});

console.log("Push sent via Expo. Check your phone.");
await prisma.$disconnect();
