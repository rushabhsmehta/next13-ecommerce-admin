#!/usr/bin/env node
/**
 * End-to-end push notification diagnostic for Aagam Holidays (travel app).
 * Usage: node tools/test-push-notification.mjs [expoPushToken]
 */
import { PrismaClient } from "@prisma/client";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const prisma = new PrismaClient();

async function sendTestPush(token) {
  const body = {
    to: token,
    title: "Aagam Holidays — Push Test",
    body: `Test notification at ${new Date().toLocaleString()}`,
    data: { type: "chat_message", groupId: "test-group", messageId: "test-msg" },
    sound: "default",
    channelId: "chat-messages",
  };

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, json };
}

async function main() {
  const argToken = process.argv[2];

  console.log("=== Push Notification Diagnostic ===\n");

  // 1. Check active tokens in DB
  const tokens = await prisma.mobilePushToken.findMany({
    where: { isActive: true },
    select: {
      expoPushToken: true,
      platform: true,
      updatedAt: true,
      travelAppUser: { select: { email: true, name: true, clerkUserId: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  console.log(`Active travel-app push tokens in DB: ${tokens.length}`);
  for (const t of tokens) {
    console.log(
      `  • ${t.travelAppUser?.name ?? "?"} (${t.platform ?? "?"}) — updated ${t.updatedAt.toISOString()}`
    );
    console.log(`    ${t.expoPushToken}`);
  }

  const travelUsers = await prisma.travelAppUser.count();
  const chatGroups = await prisma.chatGroup.count({ where: { isActive: true } });
  console.log(`\nTravel app users: ${travelUsers}`);
  console.log(`Active chat groups: ${chatGroups}`);

  // 2. Send test push
  const targetToken = argToken ?? tokens[0]?.expoPushToken;
  if (!targetToken) {
    console.log("\n❌ No push token available to test.");
    console.log("   Sign in to the app and grant notification permission, then re-run.");
    process.exit(1);
  }

  console.log(`\nSending test push to: ${targetToken}`);
  const result = await sendTestPush(targetToken);
  console.log(`Expo API response (HTTP ${result.status}):`);
  console.log(JSON.stringify(result.json, null, 2));

  const ticket = result.json?.data?.[0];
  if (ticket?.status === "ok") {
    console.log("\n✅ Push accepted by Expo. Check your phone for the notification.");
  } else if (ticket?.status === "error") {
    console.log(`\n❌ Push failed: ${ticket.message}`);
    if (ticket.details?.error) console.log(`   Detail: ${ticket.details.error}`);
  } else {
    console.log("\n⚠️  Unexpected response — see above.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
