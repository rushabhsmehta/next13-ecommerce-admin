const fetch = require('node-fetch');

const DEFAULT_CATALOG_ID = process.env.WHATSAPP_CATALOG_ID || '669842452858464';
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const META_WHATSAPP_BUSINESS_ID =
  process.env.META_WHATSAPP_BUSINESS_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '';

function buildDescriptionFromSource(source) {
  const segments = [];

  if (source.itinerarySummary) {
    segments.push(source.itinerarySummary.trim());
  }

  const pushList = (label, values) => {
    if (!values || !values.length) return;
    segments.push(`${label}:\n- ${values.join('\n- ')}`);
  };

  pushList('Highlights', source.highlights || []);
  pushList('Inclusions', source.inclusions || []);
  pushList('Exclusions', source.exclusions || []);

  if (!segments.length && source.fallback) {
    segments.push(source.fallback.trim());
  }

  return segments.join('\n\n');
}

async function ensureDefaultCatalog(prisma) {
  const existing = await prisma.whatsAppCatalog.findFirst({ where: { metaCatalogId: DEFAULT_CATALOG_ID } });
  if (existing) {
    return existing;
  }

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

async function createTourPackage(prisma, catalog, input) {
  const skuSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const product = await prisma.whatsAppProduct.create({
    data: {
      catalogId: catalog.id,
      sku: input.sku || `pkg-${skuSuffix}`,
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
      variantOptions:
        input.variants && input.variants.length
          ? { names: input.variants.map((variant) => variant.name) }
          : undefined,
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
      retailerId: (input.sku || `pkg-${skuSuffix}`).toUpperCase(),
    },
  });

  if (input.variants && input.variants.length) {
    for (const variant of input.variants) {
      const variantSku = `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const productVariant = await prisma.whatsAppProductVariant.create({
        data: {
          productId: product.id,
          sku: variantSku,
          name: variant.name,
          options: { name: variant.name },
          price: variant.priceOverride || product.price,
          imageUrl: variant.heroImageUrl || product.imageUrl,
          isActive: true,
        },
      });

      await prisma.whatsAppTourPackageVariant.create({
        data: {
          tourPackageId: tourPackage.id,
          productVariantId: productVariant.id,
          name: variant.name,
          heroImageUrl: variant.heroImageUrl || null,
          priceOverride: variant.priceOverride || null,
          status: 'active',
        },
      });
    }
  }

  await prisma.whatsAppCatalog.update({
    where: { id: catalog.id },
    data: { totalProducts: { increment: 1 }, activeProducts: { increment: 1 } },
  });

  return { tourPackage, product };
}

async function syncTourPackageToMeta(prisma, catalog, pkg, product) {
  if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_BUSINESS_ID) {
    throw new Error(
      'Meta credentials missing. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_BUSINESS_ID or META_WHATSAPP_BUSINESS_ACCOUNT_ID.'
    );
  }

  const rawPrice = product.price !== undefined && product.price !== null ? product.price : pkg.basePrice;
  const numericPrice = Number(rawPrice) || 0;
  const integerPrice = Math.round(numericPrice);

  const payload = {
    retailer_id: pkg.retailerId || product.sku,
    name: pkg.title,
    description: buildDescriptionFromSource({
      itinerarySummary: pkg.itinerarySummary,
      highlights: pkg.highlights,
      inclusions: pkg.inclusions,
      exclusions: pkg.exclusions,
      fallback: product.description,
    }),
    price: integerPrice,
    currency: pkg.currency || product.currency || 'INR',
    availability: 'in stock',
    condition: 'new',
    image_url: pkg.heroImageUrl || product.imageUrl,
    url: pkg.bookingUrl || product.url,
    brand: 'Tour Package',
  };

  const catalogId = catalog.metaCatalogId || DEFAULT_CATALOG_ID;
  const endpoint = `${catalogId}/products`;
  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error ? JSON.stringify(json.error) : `HTTP ${response.status}`);
  }

  const metaId = json.id;

  await prisma.whatsAppProduct.update({
    where: { id: product.id },
    data: { metaProductId: metaId, lastSyncAt: new Date() },
  });

  await prisma.whatsAppTourPackage.update({
    where: { id: pkg.id },
    data: { catalogProductId: metaId, syncStatus: 'synced', lastSyncAt: new Date() },
  });

  return metaId;
}

module.exports = {
  DEFAULT_CATALOG_ID,
  buildDescriptionFromSource,
  ensureDefaultCatalog,
  createTourPackage,
  syncTourPackageToMeta,
};
