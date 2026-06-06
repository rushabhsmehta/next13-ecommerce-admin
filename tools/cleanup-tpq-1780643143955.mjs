import { PrismaClient } from "@prisma/client";

const QUERY_NUMBER = "TPQ-1780643143955";

const prisma = new PrismaClient();

const query = await prisma.tourPackageQuery.findFirst({
  where: { tourPackageQueryNumber: QUERY_NUMBER },
  select: {
    id: true,
    tourPackageQueryNumber: true,
    selectedVariantIds: true,
    customQueryVariants: true,
    _count: { select: { queryVariantSnapshots: true } },
  },
});

if (!query) {
  console.log(`Query ${QUERY_NUMBER} not found`);
  await prisma.$disconnect();
  process.exit(0);
}

console.log("Before cleanup:", JSON.stringify(query, null, 2));

const deletedSnapshots = await prisma.queryVariantSnapshot.deleteMany({
  where: { tourPackageQueryId: query.id },
});

const updated = await prisma.tourPackageQuery.update({
  where: { id: query.id },
  data: {
    selectedVariantIds: [],
    customQueryVariants: [],
    variantHotelOverrides: {},
    variantRoomAllocations: {},
    variantTransportDetails: {},
    variantPricingData: {},
    confirmedVariantId: null,
  },
  select: {
    id: true,
    tourPackageQueryNumber: true,
    selectedVariantIds: true,
    customQueryVariants: true,
    _count: { select: { queryVariantSnapshots: true } },
  },
});

console.log("Deleted snapshots:", deletedSnapshots.count);
console.log("After cleanup:", JSON.stringify(updated, null, 2));

await prisma.$disconnect();
