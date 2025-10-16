const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const packages = await prisma.whatsAppTourPackage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      product: true,
    },
  });

  const summary = packages.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    status: pkg.status,
    syncStatus: pkg.syncStatus,
    metaProductId: pkg.catalogProductId,
    retailerId: pkg.retailerId,
    price: pkg.basePrice,
    heroImageUrl: pkg.heroImageUrl,
    createdAt: pkg.createdAt,
    lastSyncAt: pkg.lastSyncAt,
  }));

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
