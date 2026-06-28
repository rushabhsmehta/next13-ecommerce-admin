#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { sendMarketingBroadcast } from "../src/lib/expo-push.js";

const prisma = new PrismaClient();

const result = await sendMarketingBroadcast({
  title: "Aagam Holidays",
  body: "Marketing push test — if you see this, broadcasts work!",
  data: { linkPath: "/(tabs)" },
  appVariant: "public",
});

const record = await prisma.marketingPushBroadcast.create({
  data: {
    title: "Aagam Holidays",
    body: "Marketing push test — if you see this, broadcasts work!",
    data: { linkPath: "/(tabs)" },
    sentBy: "system-test",
    recipientCount: result.recipientCount,
    ticketOkCount: result.ticketOkCount,
    ticketErrorCount: result.ticketErrorCount,
  },
});

console.log(JSON.stringify({ ...result, broadcastId: record.id }, null, 2));
await prisma.$disconnect();
