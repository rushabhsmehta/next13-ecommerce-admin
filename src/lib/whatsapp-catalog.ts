import {
  Prisma,
  WhatsAppCatalog,
  WhatsAppCatalogSyncStatus,
  WhatsAppProduct,
  WhatsAppProductVariant,
  WhatsAppTourPackage,
  WhatsAppTourPackageStatus,
  WhatsAppTourPackageVariant,
} from '@prisma/client';
import prisma from './prismadb';
import { GraphApiError } from './whatsapp';

const DEFAULT_CATALOG_ID = process.env.WHATSAPP_CATALOG_ID || '669842452858464';
const DEFAULT_CATALOG_NAME = 'WhatsApp Tour Packages';
const FALLBACK_CURRENCY = 'INR';
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';

function assertCatalogId() {
  if (!DEFAULT_CATALOG_ID) {
    throw new Error('WHATSAPP_CATALOG_ID is not configured. Please set the environment variable.');
  }
  return DEFAULT_CATALOG_ID;
}

function toDecimal(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return new Prisma.Decimal(Number(value) || 0);
}

function formatPriceForMeta(amount?: Prisma.Decimal | number | null) {
  if (amount === null || amount === undefined) {
    return undefined;
  }
  const numeric = amount instanceof Prisma.Decimal ? Number(amount) : Number(amount);
  if (Number.isNaN(numeric)) {
    return undefined;
  }
  const integerValue = Math.round(numeric);
  return String(integerValue);
}

function extractStringArray(value: Prisma.JsonValue | string[] | null | undefined): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean);
      }
    } catch (error) {
      return [];
    }
  }
  if (typeof value === 'object') {
    const maybeArray = Object.values(value as Record<string, unknown>);
    if (maybeArray.length && maybeArray.every((item) => typeof item === 'string')) {
      return maybeArray as string[];
    }
  }
  return [];
}

function buildDescriptionFromSource(source: {
  itinerarySummary?: string | null;
  highlights?: Prisma.JsonValue | string[] | null;
  inclusions?: Prisma.JsonValue | string[] | null;
  exclusions?: Prisma.JsonValue | string[] | null;
  fallback?: string | null;
}) {
  const segments: string[] = [];
  if (source.itinerarySummary) {
    segments.push(source.itinerarySummary.trim());
  }

  const addList = (label: string, data?: Prisma.JsonValue | string[] | null) => {
    const list = extractStringArray(data);
    if (list.length) {
      segments.push(`${label}:\n- ${list.join('\n- ')}`);
    }
  };

  addList('Highlights', source.highlights);
  addList('Inclusions', source.inclusions);
  addList('Exclusions', source.exclusions);

  if (!segments.length && source.fallback) {
    segments.push(source.fallback.trim());
  }

  return segments.join('\n\n');
}

function buildRichDescription(pkg: WhatsAppTourPackage & { product: { description: string | null | undefined } }) {
  return buildDescriptionFromSource({
    itinerarySummary: pkg.itinerarySummary,
    highlights: pkg.highlights,
    inclusions: pkg.inclusions,
    exclusions: pkg.exclusions,
    fallback: pkg.product.description,
  });
}

async function ensureDefaultCatalog(): Promise<WhatsAppCatalog> {
  const catalogId = assertCatalogId();

  const existing = await prisma.whatsAppCatalog.findFirst({
    where: { metaCatalogId: catalogId },
  });

  if (existing) {
    return existing;
  }

  return prisma.whatsAppCatalog.create({
    data: {
      name: DEFAULT_CATALOG_NAME,
      metaCatalogId: catalogId,
      description: 'Auto-generated WhatsApp tour catalogue',
      currency: FALLBACK_CURRENCY,
      isActive: true,
      isPublic: false,
      autoSync: true,
    },
  });
}

type CatalogRequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: any;
  searchParams?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string>;
};

async function graphCatalogRequest<T>(endpoint: string, options: CatalogRequestOptions = {}): Promise<T> {
  if (!META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing META_WHATSAPP_ACCESS_TOKEN environment variable.');
  }

  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${endpoint}`);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const isFormData = typeof FormData !== 'undefined' && options.body && options.body instanceof FormData;
  if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
  });

  let payload: any = null;
  try {
    const raw = await response.text();
    payload = raw ? JSON.parse(raw) : null;
  } catch (error) {
    if (!response.ok) {
      throw new GraphApiError(response.status, `Meta API responded with HTTP ${response.status}`, null);
    }
  }

  if (!response.ok || payload?.error) {
    const message =
      payload?.error?.message || payload?.error?.error_data?.details || `Meta API request failed (${response.status})`;
    throw new GraphApiError(response.status, message, payload);
  }

  return payload as T;
}

export type TourPackageVariantInput = {
  id?: string;
  name: string;
  description?: string;
  priceOverride?: number | string | null;
  heroImageUrl?: string;
  availabilityNotes?: string;
  seasonalAvailability?: Array<{ start: string; end: string }>;
  status?: WhatsAppTourPackageStatus;
};

export type TourPackageInput = {
  title: string;
  subtitle?: string;
  heroImageUrl?: string;
  gallery?: string[];
  location?: string;
  itinerarySummary?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  bookingUrl?: string;
  termsAndConditions?: string;
  basePrice?: number | string | null;
  currency?: string;
  seasonalAvailability?: Array<{ start: string; end: string }>;
  durationDays?: number | null;
  durationNights?: number | null;
  status?: WhatsAppTourPackageStatus;
  variants?: TourPackageVariantInput[];
};

type TourPackageWithRelations = WhatsAppTourPackage & {
  product: WhatsAppProduct;
  variants: Array<WhatsAppTourPackageVariant & { variant: WhatsAppProductVariant }>;
};

type TransactionClient = Prisma.TransactionClient;

function buildSku(base: string) {
  const normalizedRaw = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const normalized = normalizedRaw.replace(/^-+|-+$/g, '').replace(/-+/g, '-');
  if (!normalized) {
    return `pkg-${Date.now()}`;
  }
  return normalized.slice(0, 60);
}

function normalizeStringArray(values?: string[] | null): Prisma.InputJsonValue | undefined {
  if (!values) {
    return undefined;
  }
  const cleaned = values.map((value) => value?.trim()).filter(Boolean) as string[];
  return cleaned.length ? (cleaned as Prisma.InputJsonValue) : undefined;
}

function normalizeAvailability(periods?: Array<{ start: string; end: string }>): Prisma.InputJsonValue | undefined {
  if (!Array.isArray(periods)) {
    return undefined;
  }
  const cleaned = periods
    .filter((period) => period?.start && period?.end)
    .map((period) => ({ start: period.start, end: period.end }));
  return cleaned.length ? (cleaned as Prisma.InputJsonValue) : undefined;
}

async function generateUniqueProductSku(client: TransactionClient, base: string, excludeId?: string) {
  const baseSku = buildSku(base);
  let candidate = baseSku;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await client.whatsAppProduct.findFirst({
      where: {
        sku: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSku}-${counter}`.slice(0, 60);
  }
}

async function generateUniqueVariantSku(client: TransactionClient, base: string, excludeId?: string) {
  const baseSku = buildSku(base);
  let candidate = baseSku;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await client.whatsAppProductVariant.findFirst({
      where: {
        sku: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSku}-${counter}`.slice(0, 60);
  }
}

async function fetchTourPackageWithRelations(id: string) {
  const record = await prisma.whatsAppTourPackage.findUnique({
    where: { id },
    include: {
      product: true,
      variants: {
        include: { variant: true },
      },
    },
  });

  if (!record) {
    throw new Error(`Tour package ${id} not found.`);
  }

  return record;
}

function isActiveStatus(status?: WhatsAppTourPackageStatus | null) {
  return status === WhatsAppTourPackageStatus.active;
}

function isArchivedStatus(status?: WhatsAppTourPackageStatus | null) {
  return status === WhatsAppTourPackageStatus.archived;
}

async function upsertTourPackageVariants(
  client: TransactionClient,
  params: {
    packageId: string;
    product: WhatsAppProduct;
    basePrice: Prisma.Decimal;
    variants: TourPackageVariantInput[];
    existing: Array<WhatsAppTourPackageVariant & { variant: WhatsAppProductVariant }>;
  },
) {
  const { packageId, product, basePrice, variants, existing } = params;
  const existingById = new Map(existing.map((variant) => [variant.id, variant] as const));
  const processed = new Set<string>();

  for (const input of variants) {
    const status = input.status || WhatsAppTourPackageStatus.active;
    const overrideDecimal = toDecimal(input.priceOverride);
    const variantPrice = overrideDecimal ?? basePrice;
    const optionsPayload = { name: input.name };

    if (input.id && existingById.has(input.id)) {
      const current = existingById.get(input.id)!;

      await client.whatsAppProductVariant.update({
        where: { id: current.variant.id },
        data: {
          name: input.name,
          options: optionsPayload,
          price: variantPrice,
          imageUrl: input.heroImageUrl || current.variant.imageUrl || product.imageUrl,
          availability: isActiveStatus(status) ? 'in_stock' : 'out_of_stock',
          isActive: !isArchivedStatus(status),
        },
      });

      await client.whatsAppTourPackageVariant.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description || null,
          heroImageUrl: input.heroImageUrl || null,
          priceOverride: overrideDecimal,
          availabilityNotes: input.availabilityNotes || null,
          seasonalAvailability: normalizeAvailability(input.seasonalAvailability),
          status,
        },
      });

      processed.add(input.id);
      continue;
    }

    const variantSku = await generateUniqueVariantSku(client, `${product.sku}-${input.name}`);

    const createdVariant = await client.whatsAppProductVariant.create({
      data: {
        productId: product.id,
        sku: variantSku,
        name: input.name,
        options: optionsPayload,
        price: variantPrice,
        salePrice: null,
        availability: isActiveStatus(status) ? 'in_stock' : 'out_of_stock',
        quantity: null,
        imageUrl: input.heroImageUrl || product.imageUrl,
        isActive: !isArchivedStatus(status),
      },
    });

    await client.whatsAppTourPackageVariant.create({
      data: {
        tourPackageId: packageId,
        productVariantId: createdVariant.id,
        name: input.name,
        description: input.description || null,
        heroImageUrl: input.heroImageUrl || null,
        priceOverride: overrideDecimal,
        availabilityNotes: input.availabilityNotes || null,
        seasonalAvailability: normalizeAvailability(input.seasonalAvailability),
        status,
      },
    });
  }

  for (const stale of existing) {
    if (!processed.has(stale.id) && variants.every((input) => input.id !== stale.id)) {
      await client.whatsAppTourPackageVariant.delete({ where: { id: stale.id } });
      await client.whatsAppProductVariant.delete({ where: { id: stale.variant.id } });
    }
  }
}

function collectVariantNames(variants?: TourPackageVariantInput[]): Prisma.InputJsonValue | undefined {
  if (!variants?.length) {
    return undefined;
  }
  return { names: variants.map((variant) => variant.name) } as Prisma.InputJsonValue;
}

function requiresResync(input: Partial<TourPackageInput>): boolean {
  const keys: Array<keyof TourPackageInput> = [
    'title',
    'subtitle',
    'heroImageUrl',
    'gallery',
    'location',
    'itinerarySummary',
    'highlights',
    'inclusions',
    'exclusions',
    'bookingUrl',
    'termsAndConditions',
    'basePrice',
    'currency',
    'seasonalAvailability',
    'durationDays',
    'durationNights',
    'status',
    'variants',
  ];
  return keys.some((key) => key in input);
}

export async function createTourPackage(input: TourPackageInput): Promise<TourPackageWithRelations> {
  const catalog = await ensureDefaultCatalog();
  const basePrice = toDecimal(input.basePrice) ?? new Prisma.Decimal(0);
  const status = input.status || WhatsAppTourPackageStatus.draft;

  const created = await prisma.$transaction(async (tx) => {
    const sku = await generateUniqueProductSku(tx, input.title);

    const product = await tx.whatsAppProduct.create({
      data: {
        catalogId: catalog.id,
        sku,
        name: input.title,
        description: buildDescriptionFromSource({
          itinerarySummary: input.itinerarySummary || null,
          highlights: input.highlights || null,
          inclusions: input.inclusions || null,
          exclusions: input.exclusions || null,
          fallback: input.subtitle || null,
        }),
        price: basePrice,
        currency: input.currency || catalog.currency || FALLBACK_CURRENCY,
        availability: isActiveStatus(status) ? 'in_stock' : 'out_of_stock',
        quantity: null,
        imageUrl: input.heroImageUrl || null,
  imageUrls: input.gallery?.length ? (input.gallery as Prisma.InputJsonValue) : undefined,
        videoUrl: null,
        category: input.location || null,
        brand: null,
        condition: 'new',
        hasVariants: Boolean(input.variants?.length),
        variantOptions: collectVariantNames(input.variants),
  tags: undefined,
        url: input.bookingUrl || null,
        isActive: !isArchivedStatus(status),
        isVisible: isActiveStatus(status),
      },
    });

    const tourPackage = await tx.whatsAppTourPackage.create({
      data: {
        productId: product.id,
        title: input.title,
        subtitle: input.subtitle || null,
        heroImageUrl: input.heroImageUrl || null,
  gallery: input.gallery?.length ? (input.gallery as Prisma.InputJsonValue) : undefined,
        location: input.location || null,
        itinerarySummary: input.itinerarySummary || null,
        highlights: normalizeStringArray(input.highlights),
        inclusions: normalizeStringArray(input.inclusions),
        exclusions: normalizeStringArray(input.exclusions),
        bookingUrl: input.bookingUrl || null,
        termsAndConditions: input.termsAndConditions || null,
        basePrice: toDecimal(input.basePrice),
        currency: input.currency || catalog.currency || FALLBACK_CURRENCY,
        seasonalAvailability: normalizeAvailability(input.seasonalAvailability),
        durationDays: input.durationDays ?? null,
        durationNights: input.durationNights ?? null,
        status,
        syncStatus: WhatsAppCatalogSyncStatus.pending,
        retailerId: sku.toUpperCase(),
      },
    });

    if (input.variants?.length) {
      await upsertTourPackageVariants(tx, {
        packageId: tourPackage.id,
        product,
        basePrice,
        variants: input.variants,
        existing: [],
      });
    }

    await tx.whatsAppCatalog.update({
      where: { id: catalog.id },
      data: {
        totalProducts: { increment: 1 },
        activeProducts: !isArchivedStatus(status) ? { increment: 1 } : undefined,
      },
    });

    return tourPackage.id;
  });

  return fetchTourPackageWithRelations(created);
}

export async function updateTourPackage(
  id: string,
  input: Partial<TourPackageInput>,
): Promise<TourPackageWithRelations> {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.whatsAppTourPackage.findUnique({
      where: { id },
      include: {
        product: true,
        variants: { include: { variant: true } },
      },
    });

    if (!existing) {
      throw new Error(`Tour package ${id} not found.`);
    }

    const status = input.status || existing.status;
    const basePrice =
      input.basePrice !== undefined
        ? toDecimal(input.basePrice) ?? new Prisma.Decimal(0)
        : existing.basePrice ?? existing.product.price;

    const productUpdate: Prisma.WhatsAppProductUpdateInput = {};
    if (input.title !== undefined) {
      productUpdate.name = input.title;
    }
    if (
      input.itinerarySummary !== undefined ||
      input.highlights !== undefined ||
      input.inclusions !== undefined ||
      input.exclusions !== undefined ||
      input.subtitle !== undefined
    ) {
      productUpdate.description = buildDescriptionFromSource({
        itinerarySummary: input.itinerarySummary ?? existing.itinerarySummary,
        highlights: input.highlights ?? existing.highlights,
        inclusions: input.inclusions ?? existing.inclusions,
        exclusions: input.exclusions ?? existing.exclusions,
        fallback: input.subtitle ?? existing.subtitle ?? existing.product.description,
      });
    }
    if (input.basePrice !== undefined) {
      productUpdate.price = basePrice;
    }
    if (input.currency !== undefined) {
      productUpdate.currency = input.currency || existing.currency;
    }
    if (input.heroImageUrl !== undefined) {
      productUpdate.imageUrl = input.heroImageUrl || null;
    }
    if (input.gallery !== undefined) {
      productUpdate.imageUrls = input.gallery?.length
        ? (input.gallery as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }
    if (input.location !== undefined) {
      productUpdate.category = input.location || null;
    }
    if (input.bookingUrl !== undefined) {
      productUpdate.url = input.bookingUrl || null;
    }
    if (input.variants !== undefined) {
      productUpdate.hasVariants = Boolean(input.variants?.length);
      productUpdate.variantOptions = collectVariantNames(input.variants);
    }
    productUpdate.availability = isActiveStatus(status) ? 'in_stock' : 'out_of_stock';
    productUpdate.isActive = !isArchivedStatus(status);
    productUpdate.isVisible = isActiveStatus(status);

    await tx.whatsAppProduct.update({
      where: { id: existing.productId },
      data: productUpdate,
    });

    const packageUpdate: Prisma.WhatsAppTourPackageUpdateInput = {};
    if (input.title !== undefined) packageUpdate.title = input.title;
    if (input.subtitle !== undefined) packageUpdate.subtitle = input.subtitle || null;
    if (input.heroImageUrl !== undefined) packageUpdate.heroImageUrl = input.heroImageUrl || null;
    if (input.gallery !== undefined)
      packageUpdate.gallery = input.gallery?.length
        ? (input.gallery as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    if (input.location !== undefined) packageUpdate.location = input.location || null;
    if (input.itinerarySummary !== undefined) packageUpdate.itinerarySummary = input.itinerarySummary || null;
    if (input.highlights !== undefined) packageUpdate.highlights = normalizeStringArray(input.highlights);
    if (input.inclusions !== undefined) packageUpdate.inclusions = normalizeStringArray(input.inclusions);
    if (input.exclusions !== undefined) packageUpdate.exclusions = normalizeStringArray(input.exclusions);
    if (input.bookingUrl !== undefined) packageUpdate.bookingUrl = input.bookingUrl || null;
    if (input.termsAndConditions !== undefined) packageUpdate.termsAndConditions = input.termsAndConditions || null;
    if (input.basePrice !== undefined) packageUpdate.basePrice = toDecimal(input.basePrice);
    if (input.currency !== undefined) packageUpdate.currency = input.currency || existing.currency;
    if (input.seasonalAvailability !== undefined)
      packageUpdate.seasonalAvailability = normalizeAvailability(input.seasonalAvailability);
    if (input.durationDays !== undefined) packageUpdate.durationDays = input.durationDays ?? null;
    if (input.durationNights !== undefined) packageUpdate.durationNights = input.durationNights ?? null;
    if (input.status !== undefined) packageUpdate.status = status;

    if (requiresResync(input)) {
      packageUpdate.syncStatus = WhatsAppCatalogSyncStatus.pending;
      packageUpdate.lastSyncError = null;
    }

    await tx.whatsAppTourPackage.update({
      where: { id },
      data: packageUpdate,
    });

    if (input.variants !== undefined) {
      await upsertTourPackageVariants(tx, {
        packageId: existing.id,
        product: existing.product,
        basePrice,
        variants: input.variants || [],
        existing: existing.variants,
      });
    }

    const wasActive = !isArchivedStatus(existing.status);
    const willBeActive = !isArchivedStatus(status);

    if (wasActive !== willBeActive) {
      await tx.whatsAppCatalog.update({
        where: { id: existing.product.catalogId },
        data: {
          activeProducts: { increment: willBeActive ? 1 : -1 },
        },
      });
    }

    return existing.id;
  });

  return fetchTourPackageWithRelations(updated);
}

export async function syncTourPackageToMeta(id: string): Promise<TourPackageWithRelations> {
  const catalog = await ensureDefaultCatalog();
  if (!catalog.metaCatalogId) {
    throw new Error('Meta catalog is not configured for synchronization.');
  }

  const pkg = await prisma.whatsAppTourPackage.findUnique({
    where: { id },
    include: {
      product: true,
    },
  });

  if (!pkg) {
    throw new Error(`Tour package ${id} not found.`);
  }

  await prisma.whatsAppTourPackage.update({
    where: { id },
    data: {
      syncStatus: WhatsAppCatalogSyncStatus.in_progress,
      lastSyncError: null,
    },
  });

  try {
    const payload: Record<string, any> = {
      retailer_id: pkg.retailerId || pkg.product.sku,
      name: pkg.title,
      description: buildRichDescription(pkg as WhatsAppTourPackage & { product: WhatsAppProduct }),
      price: formatPriceForMeta(pkg.basePrice ?? pkg.product.price),
      currency: pkg.currency || pkg.product.currency || FALLBACK_CURRENCY,
      availability: isActiveStatus(pkg.status) ? 'in stock' : 'out of stock',
      condition: 'new',
      image_url: pkg.heroImageUrl || pkg.product.imageUrl,
      url: pkg.bookingUrl || pkg.product.url,
      brand: 'Tour Package',
    };

    if (Array.isArray(pkg.gallery) && pkg.gallery.length) {
      const additionalImages = pkg.gallery
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
        .slice(0, 10);
      if (additionalImages.length) {
        payload.additional_image_urls = additionalImages;
      }
    }

    let metaProductId = pkg.catalogProductId || pkg.product.metaProductId || null;
    if (metaProductId) {
      await graphCatalogRequest(`${metaProductId}`, {
        method: 'POST',
        body: payload,
      });
    } else {
      const response = await graphCatalogRequest<{ id: string }>(`${catalog.metaCatalogId}/products`, {
        method: 'POST',
        body: payload,
      });
      metaProductId = response.id;
    }

    await prisma.whatsAppProduct.update({
      where: { id: pkg.productId },
      data: {
        metaProductId: metaProductId || undefined,
        lastSyncAt: new Date(),
      },
    });

    await prisma.whatsAppTourPackage.update({
      where: { id },
      data: {
        catalogProductId: metaProductId || undefined,
        syncStatus: WhatsAppCatalogSyncStatus.synced,
        lastSyncAt: new Date(),
        lastSyncError: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync failure';
    await prisma.whatsAppTourPackage.update({
      where: { id },
      data: {
        syncStatus: WhatsAppCatalogSyncStatus.failed,
        lastSyncError: message,
      },
    });
    throw error;
  }

  return fetchTourPackageWithRelations(id);
}

export async function deleteTourPackage(id: string, options?: { removeFromMeta?: boolean }) {
  const removeFromMeta = options?.removeFromMeta !== false;

  const pkg = await prisma.whatsAppTourPackage.findUnique({
    where: { id },
    include: {
      product: true,
    },
  });

  if (!pkg) {
    throw new Error(`Tour package ${id} not found.`);
  }

  const metaProductId = pkg.catalogProductId || pkg.product.metaProductId;

  if (removeFromMeta && metaProductId) {
    try {
      await graphCatalogRequest(`${metaProductId}`, { method: 'DELETE' });
    } catch (error) {
      const isGraphError = error instanceof GraphApiError;
      const status = isGraphError ? (error as GraphApiError).status : undefined;
      const graphPayload = isGraphError ? (error as GraphApiError).response?.error : undefined;
      const graphCode = graphPayload?.code;
      const graphMessage = (error as Error).message || '';
      const unsupportedDelete = /unsupported delete request/i.test(graphMessage);

      if (!isGraphError || (!unsupportedDelete && status !== 404 && graphCode !== 100)) {
        throw error;
      }

      console.warn('Meta product delete ignored because it appears to be already removed', {
        metaProductId,
        status,
        graphCode,
        graphMessage,
      });
    }
  }

  const wasActive = !isArchivedStatus(pkg.status);

  await prisma.$transaction(
    async (tx) => {
      await tx.whatsAppTourPackageVariant.deleteMany({ where: { tourPackageId: id } });
      await tx.whatsAppProductVariant.deleteMany({ where: { productId: pkg.productId } });
      await tx.whatsAppTourPackage.delete({ where: { id } });
      await tx.whatsAppProduct.delete({ where: { id: pkg.productId } });

      const updateData: Prisma.WhatsAppCatalogUpdateInput = {
        totalProducts: { decrement: 1 },
      };

      if (wasActive) {
        updateData.activeProducts = { decrement: 1 };
      }

      await tx.whatsAppCatalog.update({
        where: { id: pkg.product.catalogId },
        data: updateData,
      });
    },
    { timeout: 20000 }
  );
}

export async function syncPendingTourPackages(limit = 10) {
  const catalog = await ensureDefaultCatalog();
  if (!catalog.metaCatalogId) {
    throw new Error('Meta catalog is not configured for synchronization.');
  }

  const queue = await prisma.whatsAppTourPackage.findMany({
    where: {
      syncStatus: { in: [WhatsAppCatalogSyncStatus.pending, WhatsAppCatalogSyncStatus.failed] },
      status: { not: WhatsAppTourPackageStatus.archived },
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  const results: { id: string; status: 'synced' | 'failed'; error?: string }[] = [];

  for (const item of queue) {
    try {
      await syncTourPackageToMeta(item.id);
      results.push({ id: item.id, status: 'synced' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync failure';
      results.push({ id: item.id, status: 'failed', error: message });
    }
  }

  return {
    catalogId: catalog.id,
    processed: results.length,
    successes: results.filter((item) => item.status === 'synced').length,
    failures: results.filter((item) => item.status === 'failed').length,
    results,
  };
}

export async function ensureCatalogReady() {
  return ensureDefaultCatalog();
}

export async function listTourPackages() {
  const packages = await prisma.whatsAppTourPackage.findMany({
    include: {
      product: true,
      variants: {
        include: { variant: true },
      },
    },
  });

  return packages;
}
