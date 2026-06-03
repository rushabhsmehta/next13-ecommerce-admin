/**
 * Point aagamholiday@gmail.com OrganizationMember (and TravelAppUser) at the live Clerk user id.
 * Usage: node tools/fix-aagam-clerk-id.mjs user_3EdLYS3NGkkkuwkfnQe8xym9EQm
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "aagamholiday@gmail.com";
const newUserId = process.argv[2];

if (!newUserId?.startsWith("user_")) {
  console.error("Usage: node tools/fix-aagam-clerk-id.mjs <clerk_user_id>");
  process.exit(1);
}

async function main() {
  const om = await prisma.organizationMember.updateMany({
    where: { email: EMAIL, isActive: true },
    data: { userId: newUserId },
  });
  console.log("[OrganizationMember] rows updated:", om.count);

  const tau = await prisma.travelAppUser.updateMany({
    where: { email: EMAIL },
    data: { clerkUserId: newUserId },
  });
  console.log("[TravelAppUser] rows updated:", tau.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
