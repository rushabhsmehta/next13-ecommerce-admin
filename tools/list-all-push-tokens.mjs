#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const all = await prisma.mobilePushToken.findMany({
  orderBy: { updatedAt: "desc" },
  take: 15,
  include: { travelAppUser: { select: { email: true, name: true } } },
});
console.log(`Total tokens (all): ${all.length}`);
for (const t of all) {
  console.log(
    `[${t.isActive ? "active" : "inactive"}] ${t.updatedAt.toISOString()} | ${t.travelAppUser?.email} | ${t.expoPushToken.slice(0, 50)}...`
  );
}
await prisma.$disconnect();
