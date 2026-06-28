#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const count = await prisma.devicePushToken.count();
  const active = await prisma.devicePushToken.count({
    where: { isActive: true, marketingOptIn: true, appVariant: "public" },
  });
  const recent = await prisma.devicePushToken.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      expoPushToken: true,
      platform: true,
      isActive: true,
      updatedAt: true,
      travelAppUserId: true,
    },
  });
  console.log("DevicePushToken table OK. total:", count, "active marketing:", active);
  console.log(JSON.stringify(recent, null, 2));
} catch (e) {
  console.error("Table missing or error:", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
