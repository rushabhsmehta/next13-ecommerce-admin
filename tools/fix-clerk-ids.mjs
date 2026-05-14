// Re-point TravelAppUser and OrganizationMember rows to the live (many-flamingo-6)
// Clerk user IDs so Rushabh + Deep can sign in with Google on mobile.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_RUSHABH = "user_3DfsdbyOqC7KfOgpmgWu7up9A3T";
const NEW_AAGAM = "user_3DfsZ9IgOM9DGscsg22563ab7gF";
const RUSHABH_EMAIL = "mehtarushabh2310@gmail.com";
const AAGAM_EMAIL = "aagamholiday@gmail.com";

async function main() {
  // 1. TravelAppUser: Rushabh → set new clerkUserId + approve
  const tau1 = await prisma.travelAppUser.update({
    where: { email: RUSHABH_EMAIL },
    data: { clerkUserId: NEW_RUSHABH, isApproved: true },
    select: { id: true, email: true, clerkUserId: true, isApproved: true },
  });
  console.log("[1] TravelAppUser updated:", tau1);

  // 2. TravelAppUser: Deep (aagamholiday) → set new clerkUserId
  const tau2 = await prisma.travelAppUser.update({
    where: { email: AAGAM_EMAIL },
    data: { clerkUserId: NEW_AAGAM },
    select: { id: true, email: true, clerkUserId: true, isApproved: true },
  });
  console.log("[2] TravelAppUser updated:", tau2);

  // 3. OrganizationMember ADMIN (aagamholiday) → set new userId
  const om = await prisma.organizationMember.updateMany({
    where: { email: AAGAM_EMAIL, role: "ADMIN", isActive: true },
    data: { userId: NEW_AAGAM },
  });
  console.log("[3] OrganizationMember rows updated:", om.count);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
