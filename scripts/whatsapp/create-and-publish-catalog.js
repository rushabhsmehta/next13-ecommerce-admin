const { PrismaClient } = require('@prisma/whatsapp-client');
require('dotenv').config();

const {
  ensureDefaultCatalog,
  createTourPackage,
  syncTourPackageToMeta,
} = require('./catalog-utils');

const prisma = new PrismaClient();

async function main() {
  try {
    const catalog = await ensureDefaultCatalog(prisma);
    console.log('Catalog ready: ', catalog.id, catalog.metaCatalogId);

    const input = {
      title: 'Sunrise Kerala Backwaters - 4 Days (JS script)',
      subtitle: 'A relaxing houseboat experience',
      heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample_houseboat.jpg',
      gallery: ['https://res.cloudinary.com/demo/image/upload/v1/sample_houseboat_1.jpg'],
      location: 'Kerala',
      itinerarySummary: 'Day 1: Kochi. Day 2: Houseboat. Day 3: Village. Day 4: Departure',
      highlights: ['Houseboat', 'Cuisine'],
      inclusions: ['Accommodation', 'Meals'],
      exclusions: ['Flights'],
      bookingUrl: 'https://example.com/book/kerala-js',
      basePrice: 19999,
      currency: 'INR',
      durationDays: 4,
      durationNights: 3,
      status: 'active',
      variants: [
        {
          name: 'Standard Cabin',
          priceOverride: 19999,
          heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/standard.jpg',
        },
      ],
    };

    const { tourPackage, product } = await createTourPackage(prisma, catalog, input);
    console.log('Created tourPackage:', tourPackage.id, 'product:', product.id);

    try {
      const metaId = await syncTourPackageToMeta(prisma, catalog, tourPackage, product);
      console.log('Published to Meta with id:', metaId);
    } catch (err) {
      console.error('Publish failed:', err.message || err);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
