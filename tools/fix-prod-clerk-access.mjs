/**
 * Keep both dev + production Clerk user IDs active for aagamholiday@gmail.com.
 * Production (admin.aagamholidays.com) uses the live Clerk id; local dev uses many-flamingo-6.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ORG_ID = "23d56206-d22a-4f01-808b-906ffc18feab";
const EMAIL = "aagamholiday@gmail.com";
const PROD_CLERK_ID = "user_3EdLYS3NGkkkuwkfnQe8xym9EQm";
const DEV_CLERK_ID = "user_3DfsZ9IgOM9DGscsg22563ab7gF";

async function ensureAdmin(userId) {
  const row = await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: ORG_ID, userId } },
    create: {
      organizationId: ORG_ID,
      userId,
      email: EMAIL,
      role: "ADMIN",
      isActive: true,
    },
    update: { email: EMAIL, role: "ADMIN", isActive: true },
  });
  console.log("Active ADMIN:", row.userId);
}

async function main() {
  await ensureAdmin(PROD_CLERK_ID);
  await ensureAdmin(DEV_CLERK_ID);

  const members = await prisma.organizationMember.findMany({
    where: { email: EMAIL },
    select: { userId: true, role: true, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("Members for", EMAIL + ":", JSON.stringify(members, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
