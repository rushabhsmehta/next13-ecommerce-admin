const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const {
  ensureDefaultCatalog,
  createTourPackage,
  syncTourPackageToMeta,
} = require('./catalog-utils');

const prisma = new PrismaClient();

const packages = [
  {
    title: 'Himalayan Snow Escape',
    subtitle: 'Witness snow-capped peaks and cozy mountain stays',
    heroImageUrl: 'https://images.pexels.com/photos/1151335/pexels-photo-1151335.jpeg',
    gallery: [
      'https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg',
      'https://images.pexels.com/photos/2868242/pexels-photo-2868242.jpeg',
    ],
    location: 'Manali, Himachal Pradesh',
    itinerarySummary:
      'Day 1: Arrival and local exploration. Day 2: Snow adventure in Solang Valley. Day 3: Rohtang Pass excursion. Day 4: Leisure and departure.',
    highlights: ['Solang Valley snow sports', 'Rohtang Pass excursion', 'Local Himachali cuisine'],
    inclusions: ['Hotel accommodation', 'Daily breakfast and dinner', 'Private transfers'],
    exclusions: ['Flights', 'Personal expenses'],
    bookingUrl: 'https://example.com/book/himalayan-snow-escape',
    basePrice: 24999,
    currency: 'INR',
    durationDays: 4,
    durationNights: 3,
    status: 'active',
  },
  {
    title: 'Maldives Lagoon Getaway',
    subtitle: 'Crystal clear waters and overwater villas',
    heroImageUrl: 'https://images.pexels.com/photos/1450361/pexels-photo-1450361.jpeg',
    gallery: [
      'https://images.pexels.com/photos/1118873/pexels-photo-1118873.jpeg',
      'https://images.pexels.com/photos/3601426/pexels-photo-3601426.jpeg',
    ],
    location: 'South Male Atoll',
    itinerarySummary:
      'Day 1: Speedboat transfer and sunset cruise. Day 2: Snorkelling and spa. Day 3: Sandbank picnic. Day 4: Leisure and departure.',
    highlights: ['Sunset cruise', 'Snorkelling at coral reefs', 'Private sandbank picnic'],
    inclusions: ['Overwater villa stay', 'All meals', 'Airport transfers'],
    exclusions: ['International flights', 'Travel insurance'],
    bookingUrl: 'https://example.com/book/maldives-lagoon-getaway',
    basePrice: 89999,
    currency: 'INR',
    durationDays: 4,
    durationNights: 3,
    status: 'active',
    variants: [
      {
        name: 'Sunset Villa',
        priceOverride: 94999,
        heroImageUrl: 'https://images.pexels.com/photos/2613273/pexels-photo-2613273.jpeg',
      },
      {
        name: 'Water Pool Villa',
        priceOverride: 109999,
        heroImageUrl: 'https://images.pexels.com/photos/3319961/pexels-photo-3319961.jpeg',
      },
    ],
  },
  {
    title: 'Rajasthan Heritage Trail',
    subtitle: 'Palaces, desert safaris, and cultural evenings',
    heroImageUrl: 'https://images.pexels.com/photos/3889981/pexels-photo-3889981.jpeg',
    gallery: [
      'https://images.pexels.com/photos/161235/books-india-jaipur-palace-161235.jpeg',
      'https://images.pexels.com/photos/326055/pexels-photo-326055.jpeg',
    ],
    location: 'Jaipur, Jodhpur & Jaisalmer',
    itinerarySummary:
      'Day 1: Jaipur forts and bazaars. Day 2: Blue city tour in Jodhpur. Day 3: Desert safari in Jaisalmer. Day 4: Cultural evening and departure.',
    highlights: ['Amber Fort visit', 'Desert camp stay', 'Traditional folk performances'],
    inclusions: ['Heritage hotel stays', 'Breakfast and dinner', 'AC chauffeur-driven vehicle'],
    exclusions: ['Entry tickets', 'Lunches'],
    bookingUrl: 'https://example.com/book/rajasthan-heritage-trail',
    basePrice: 32999,
    currency: 'INR',
    durationDays: 4,
    durationNights: 3,
    status: 'active',
  },
  {
    title: 'Andaman Diving Adventure',
    subtitle: 'Tropical islands with world-class diving spots',
    heroImageUrl: 'https://images.pexels.com/photos/3861440/pexels-photo-3861440.jpeg',
    gallery: [
      'https://images.pexels.com/photos/3861441/pexels-photo-3861441.jpeg',
      'https://images.pexels.com/photos/1298684/pexels-photo-1298684.jpeg',
    ],
    location: 'Havelock & Neil Islands',
    itinerarySummary:
      'Day 1: Port Blair arrival and Cellular Jail. Day 2: Havelock scuba dive. Day 3: Elephant Beach snorkel. Day 4: Neil Island exploration. Day 5: Return.',
    highlights: ['PADI certified dive', 'Elephant Beach snorkelling', 'Neil Island beaches'],
    inclusions: ['Diver instructor fees', 'Hotel transfers', 'Breakfast'],
    exclusions: ['Airfare', 'Lunch & dinner'],
    bookingUrl: 'https://example.com/book/andaman-diving-adventure',
    basePrice: 41999,
    currency: 'INR',
    durationDays: 5,
    durationNights: 4,
    status: 'active',
  },
  {
    title: 'Varanasi Spiritual Retreat',
    subtitle: 'Morning aartis, boat rides, and heritage walk',
    heroImageUrl: 'https://images.pexels.com/photos/5414060/pexels-photo-5414060.jpeg',
    gallery: [
      'https://images.pexels.com/photos/5414066/pexels-photo-5414066.jpeg',
      'https://images.pexels.com/photos/5414137/pexels-photo-5414137.jpeg',
    ],
    location: 'Varanasi, Uttar Pradesh',
    itinerarySummary:
      'Day 1: Evening Ganga aarti. Day 2: Sunrise boat ride and silk weaving tour. Day 3: Sarnath excursion. Day 4: Heritage walk and departure.',
    highlights: ['Ganga aarti', 'Sunrise boat ride', 'Sarnath visit'],
    inclusions: ['Hotel stay', 'Breakfast', 'Guided tours'],
    exclusions: ['Flights', 'Personal expenses'],
    bookingUrl: 'https://example.com/book/varanasi-spiritual-retreat',
    basePrice: 18999,
    currency: 'INR',
    durationDays: 4,
    durationNights: 3,
    status: 'active',
  },
];

async function main() {
  try {
    console.log('Ensuring default catalog is ready...');
    const catalog = await ensureDefaultCatalog(prisma);
    console.log('Catalog ready:', catalog.id, 'metaCatalogId=', catalog.metaCatalogId);

    for (const pkg of packages) {
      try {
        console.log(`\nCreating package: ${pkg.title}`);
        const { tourPackage, product } = await createTourPackage(prisma, catalog, pkg);
        console.log('Created package id:', tourPackage.id, 'product id:', product.id);

        try {
          const metaId = await syncTourPackageToMeta(prisma, catalog, tourPackage, product);
          console.log('Synced to Meta with product id:', metaId);
        } catch (syncError) {
          console.error('Failed to sync with Meta:', syncError instanceof Error ? syncError.message : syncError);
        }
      } catch (createError) {
        console.error('Failed to create package:', createError instanceof Error ? createError.message : createError);
      }
    }
  } catch (error) {
    console.error('Script terminated with error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
