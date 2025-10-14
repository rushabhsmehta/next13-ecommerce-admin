import 'ts-node/register';
import prisma from '../../src/lib/prismadb';
import {
  createTourPackage,
  syncTourPackageToMeta,
  ensureCatalogReady,
} from '../../src/lib/whatsapp-catalog';

async function main() {
  console.log('Ensuring default catalog exists...');
  const catalog = await ensureCatalogReady();
  console.log('Catalog ready:', catalog.id, 'metaCatalogId=', catalog.metaCatalogId);

  console.log('Creating sample tour package...');
  const input = {
    title: 'Sunrise Kerala Backwaters - 4 Days',
    subtitle: 'A relaxing houseboat experience with spices and culture',
    heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_houseboat.jpg',
    gallery: [
      'https://res.cloudinary.com/demo/image/upload/v1/sample_houseboat_1.jpg',
      'https://res.cloudinary.com/demo/image/upload/v1/sample_houseboat_2.jpg',
    ],
    location: 'Kerala',
    itinerarySummary: 'Day 1: Kochi arrival. Day 2: Houseboat cruise. Day 3: Village visit. Day 4: Departure',
    highlights: ['Houseboat cruise', 'Local cuisine', 'Village walks'],
    inclusions: ['Accommodation', 'Breakfast', 'Houseboat meals'],
    exclusions: ['Flights', 'Taxes'],
    bookingUrl: 'https://example.com/book/kerala-backwaters',
    basePrice: 19999,
    currency: 'INR',
    durationDays: 4,
    durationNights: 3,
    status: 'active',
    variants: [
      { name: 'Standard Cabin', priceOverride: 19999, heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/standard.jpg' },
      { name: 'Deluxe Cabin', priceOverride: 24999, heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/deluxe.jpg' },
    ],
  } as any;

  const created = await createTourPackage(input);
  console.log('Created tour package:', created.id);

  try {
    console.log('Syncing to Meta (publish)...');
    const synced = await syncTourPackageToMeta(created.id);
    console.log('Synced successfully. Meta product id:', synced.product.metaProductId);
  } catch (err) {
    console.error('Sync failed:', err instanceof Error ? err.message : err);
  }
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
