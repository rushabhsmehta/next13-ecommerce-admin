#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const tokens = await prisma.mobilePushToken.findMany({
    where: { isActive: true },
    select: {
      id: true,
      expoPushToken: true,
      platform: true,
      updatedAt: true,
      travelAppUser: {
        select: { email: true, clerkUserId: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  console.log(`Active MobilePushToken count: ${tokens.length}`);
  for (const t of tokens) {
    console.log("---");
    console.log(`User: ${t.travelAppUser?.name ?? "?"} <${t.travelAppUser?.email ?? "?"}>`);
    console.log(`Clerk: ${t.travelAppUser?.clerkUserId ?? "?"}`);
    console.log(`Platform: ${t.platform ?? "?"}`);
    console.log(`Updated: ${t.updatedAt.toISOString()}`);
    console.log(`Token: ${t.expoPushToken}`);
  }

  const adminTokens = await prisma.adminMobileToken.findMany({
    where: { pushToken: { not: null } },
    select: {
      id: true,
      pushToken: true,
      userName: true,
      userId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  console.log(`\nAdmin push tokens: ${adminTokens.length}`);
  for (const a of adminTokens) {
    console.log(`--- ${a.userName ?? a.clerkUserId}: ${a.pushToken}`);
  }
} catch (err) {
  console.error("DB query failed:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
