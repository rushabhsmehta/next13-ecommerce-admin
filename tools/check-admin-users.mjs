// Quick diagnostic: active OrganizationMember rows (userId should be Clerk user_… ids).
// Also lists recent TravelAppUser rows with clerkUserId for comparison.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.organizationMember.findMany({
    where: { isActive: true },
    select: {
      userId: true,
      email: true,
      role: true,
      organizationId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log("---- OrganizationMember (active) ----");
  for (const m of members) {
    console.log(`${m.role.padEnd(10)} userId=${m.userId.padEnd(38)} email=${m.email ?? ""}`);
  }

  console.log("");
  console.log("---- TravelAppUser (latest 20) ----");
  const tau = await prisma.travelAppUser.findMany({
    select: { clerkUserId: true, email: true, name: true, isApproved: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const u of tau) {
    console.log(
      `${u.clerkUserId}  ${(u.email ?? "").padEnd(38)} approved=${u.isApproved}  ${u.name ?? ""}`
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
