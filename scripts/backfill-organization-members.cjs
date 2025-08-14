const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations`);
  let created = 0; let skipped = 0;
  for (const org of orgs) {
    const staff = await prisma.operationalStaff.findFirst({ orderBy: { createdAt: 'asc' } });
    if (staff) {
      const existing = await prisma.organizationMember.findFirst({ where: { organizationId: org.id, userId: staff.id } });
      if (existing) { skipped++; continue; }
      await prisma.organizationMember.create({ data: { organizationId: org.id, userId: staff.id, email: staff.email, role: 'FINANCE' } });
      created++;
      console.log(`Created FINANCE member for org ${org.id} user ${staff.email}`);
    } else {
      console.log(`No staff found to assign for org ${org.id}, skipped`); skipped++; continue;
    }
  }
  console.log(`Backfill complete. Created: ${created}, Skipped: ${skipped}`);
}

run().catch(e => { console.error(e); process.exit(1); }).finally(()=> prisma.$disconnect());
