const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');
require('dotenv').config();

const prisma = new PrismaClient();

const DEFAULT_CATALOG_ID = process.env.WHATSAPP_CATALOG_ID || '669842452858464';
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const META_WHATSAPP_BUSINESS_ID = process.env.META_WHATSAPP_BUSINESS_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '';

async function ensureDefaultCatalog() {
  const existing = await prisma.whatsAppCatalog.findFirst({ where: { metaCatalogId: DEFAULT_CATALOG_ID } });
  if (existing) return existing;
  return prisma.whatsAppCatalog.create({
    data: {
      name: 'WhatsApp Tour Packages',
      metaCatalogId: DEFAULT_CATALOG_ID,
      description: 'Auto-generated WhatsApp tour catalogue',
      currency: 'INR',
      isActive: true,
      isPublic: false,
      autoSync: true,
    },
  });
}

function buildDescriptionFromSource(source) {
  const segments = [];
  if (source.itinerarySummary) segments.push(source.itinerarySummary.trim());
  const addList = (label, data) => {
    if (!data) return;
    if (Array.isArray(data) && data.length) {
      segments.push(`${label}:\n- ${data.join('\n- ')}`);
    }
  };
  addList('Highlights', source.highlights);
  addList('Inclusions', source.inclusions);
  addList('Exclusions', source.exclusions);
  if (!segments.length && source.fallback) segments.push(source.fallback.trim());
  return segments.join('\n\n');
}

async function createTourPackage(input) {
  const catalog = await ensureDefaultCatalog();
  const product = await prisma.whatsAppProduct.create({
    data: {
      catalogId: catalog.id,
      sku: `pkg-${Date.now()}`,
      name: input.title,
      description: buildDescriptionFromSource({
        itinerarySummary: input.itinerarySummary,
        highlights: input.highlights,
        inclusions: input.inclusions,
        exclusions: input.exclusions,
        fallback: input.subtitle,
      }),
      price: input.basePrice || 0,
      currency: input.currency || catalog.currency || 'INR',
      availability: 'in_stock',
      imageUrl: input.heroImageUrl || null,
      imageUrls: input.gallery && input.gallery.length ? input.gallery : undefined,
      category: input.location || null,
      hasVariants: Boolean(input.variants && input.variants.length),
      variantOptions: input.variants && input.variants.length ? { names: input.variants.map(v => v.name) } : undefined,
      url: input.bookingUrl || null,
      isActive: true,
      isVisible: true,
    },
  });

  const tourPackage = await prisma.whatsAppTourPackage.create({
    data: {
      productId: product.id,
      title: input.title,
      subtitle: input.subtitle || null,
      heroImageUrl: input.heroImageUrl || null,
      gallery: input.gallery && input.gallery.length ? input.gallery : undefined,
      location: input.location || null,
      itinerarySummary: input.itinerarySummary || null,
      highlights: input.highlights && input.highlights.length ? input.highlights : undefined,
      inclusions: input.inclusions && input.inclusions.length ? input.inclusions : undefined,
      exclusions: input.exclusions && input.exclusions.length ? input.exclusions : undefined,
      bookingUrl: input.bookingUrl || null,
      basePrice: input.basePrice || null,
      currency: input.currency || catalog.currency || 'INR',
      seasonalAvailability: input.seasonalAvailability || undefined,
      durationDays: input.durationDays || null,
      durationNights: input.durationNights || null,
      status: input.status || 'active',
      syncStatus: 'pending',
      retailerId: product.sku.toUpperCase(),
    },
  });

  if (input.variants && input.variants.length) {
    for (const v of input.variants) {
      const variant = await prisma.whatsAppProductVariant.create({
        data: {
          productId: product.id,
          sku: `var-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          name: v.name,
          options: { name: v.name },
          price: v.priceOverride || product.price,
          imageUrl: v.heroImageUrl || product.imageUrl,
          isActive: true,
        },
      });

      await prisma.whatsAppTourPackageVariant.create({
        data: {
          tourPackageId: tourPackage.id,
          productVariantId: variant.id,
          name: v.name,
          heroImageUrl: v.heroImageUrl || null,
          priceOverride: v.priceOverride || null,
          status: 'active',
        },
      });
    }
  }

  await prisma.whatsAppCatalog.update({ where: { id: catalog.id }, data: { totalProducts: { increment: 1 }, activeProducts: { increment: 1 } } });

  return { tourPackage, product };
}

async function syncToMeta(catalogId, pkg, product) {
  if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_BUSINESS_ID) {
    throw new Error('Meta credentials missing. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_BUSINESS_ID or META_WHATSAPP_BUSINESS_ACCOUNT_ID');
  }

  // Meta expects price as an integer (whole currency units). Convert safely.
  const rawPrice = product.price !== undefined && product.price !== null ? product.price : pkg.basePrice;
  const numericPrice = Number(rawPrice) || 0;
  const integerPrice = Math.round(numericPrice);

  const payload = {
    retailer_id: pkg.retailerId || product.sku,
    name: pkg.title,
    description: buildDescriptionFromSource({ itinerarySummary: pkg.itinerarySummary, highlights: pkg.highlights, inclusions: pkg.inclusions, exclusions: pkg.exclusions, fallback: product.description }),
    // Send whole units as integer (e.g., 19999)
    price: integerPrice,
    currency: pkg.currency || product.currency || 'INR',
    availability: 'in stock',
    condition: 'new',
    image_url: pkg.heroImageUrl || product.imageUrl,
    url: pkg.bookingUrl || product.url,
    brand: 'Tour Package',
  };

  const endpoint = `${DEFAULT_CATALOG_ID}/products`;
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${res.status}`);
  }

  const metaId = json.id;
  await prisma.whatsAppProduct.update({ where: { id: product.id }, data: { metaProductId: metaId, lastSyncAt: new Date() } });
  await prisma.whatsAppTourPackage.update({ where: { id: pkg.id }, data: { catalogProductId: metaId, syncStatus: 'synced', lastSyncAt: new Date() } });

  return metaId;
}

async function main() {
  try {
    const catalog = await ensureDefaultCatalog();
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
        { name: 'Standard Cabin', priceOverride: 19999, heroImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/standard.jpg' },
      ],
    };

    const { tourPackage, product } = await createTourPackage(input);
    console.log('Created tourPackage:', tourPackage.id, 'product:', product.id);

    try {
      const metaId = await syncToMeta(catalog.metaCatalogId || DEFAULT_CATALOG_ID, tourPackage, product);
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
