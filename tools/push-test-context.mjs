#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RUSHABH_CLERK = "user_3DfsdbyOqC7KfOgpmgWu7up9A3T";

const rushabh = await prisma.travelAppUser.findUnique({
  where: { clerkUserId: RUSHABH_CLERK },
  select: { id: true, name: true, email: true },
});

if (!rushabh) {
  console.log("Rushabh travel user not found");
  process.exit(1);
}

const memberships = await prisma.chatGroupMember.findMany({
  where: { travelAppUserId: rushabh.id, isActive: true },
  include: {
    chatGroup: { select: { id: true, name: true, isActive: true } },
  },
});

console.log(`Chat groups for ${rushabh.name}:`);
for (const m of memberships) {
  const others = await prisma.chatGroupMember.findMany({
    where: {
      chatGroupId: m.chatGroupId,
      isActive: true,
      travelAppUserId: { not: rushabh.id },
    },
    include: { travelAppUser: { select: { name: true, email: true } } },
  });
  console.log(`\n• ${m.chatGroup.name} (${m.chatGroupId})`);
  console.log(`  Other members: ${others.map((o) => o.travelAppUser.name).join(", ") || "(none)"}`);
}

const tokens = await prisma.mobilePushToken.findMany({
  where: { travelAppUserId: rushabh.id, isActive: true },
});
console.log(`\nPush tokens for ${rushabh.email}: ${tokens.length}`);
for (const t of tokens) console.log(`  ${t.expoPushToken}`);

await prisma.$disconnect();
