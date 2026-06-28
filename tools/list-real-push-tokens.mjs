#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const tokens = await prisma.mobilePushToken.findMany({
  where: {
    isActive: true,
    not: { expoPushToken: { contains: "diagnostic" } },
  },
  select: {
    expoPushToken: true,
    platform: true,
    updatedAt: true,
    travelAppUser: { select: { name: true, email: true } },
  },
  orderBy: { updatedAt: "desc" },
});
console.log(`Real device tokens: ${tokens.length}`);
for (const t of tokens) {
  console.log(`${t.travelAppUser?.name} | ${t.updatedAt.toISOString()} | ${t.expoPushToken}`);
}
await prisma.$disconnect();
