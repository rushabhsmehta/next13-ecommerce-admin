import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NEW_ID = process.argv[2] || "user_3EdLYS3NGkkkuwkfnQe8xym9EQm";
const EMAIL = "aagamholiday@gmail.com";

async function main() {
  const byEmail = await prisma.organizationMember.findMany({
    where: { email: EMAIL },
    select: {
      id: true,
      userId: true,
      email: true,
      role: true,
      isActive: true,
      organizationId: true,
    },
  });
  const byNewId = await prisma.organizationMember.findMany({
    where: { userId: NEW_ID },
    select: { id: true, userId: true, email: true, role: true, isActive: true },
  });
  console.log("Clerk userId to match:", NEW_ID);
  console.log("By email:", JSON.stringify(byEmail, null, 2));
  console.log("By new userId:", JSON.stringify(byNewId, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
