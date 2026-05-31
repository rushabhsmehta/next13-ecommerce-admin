import { z } from "zod";
import {
  parsePolicyField,
  parsePricingSection,
  type PolicyFieldKey,
} from "@/app/api/mobile/tour-packages/policy-fields";

export const itineraryDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  itineraryTitle: z.string().min(1).max(500),
  itineraryDescription: z.string().max(5000).optional().nullable(),
  mealsIncluded: z.string().max(200).optional().nullable(),
});

export const imageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
});

export const pricingSectionRowSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const policyArray = z.array(z.string()).optional();

export const tourPackageWriteSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  tourPackageName: z.string().min(1, "Package name is required").max(300),
  tourPackageType: z.string().max(100).optional().nullable(),
  tourCategory: z.string().max(50).optional().nullable(),
  numDaysNight: z.string().max(100).optional().nullable(),
  transport: z.string().max(200).optional().nullable(),
  pickup_location: z.string().max(300).optional().nullable(),
  drop_location: z.string().max(300).optional().nullable(),
  price: z.string().max(100).optional().nullable(),
  itineraries: z.array(itineraryDaySchema).optional(),
  images: z.array(imageSchema).optional(),
  pricingSection: z.array(pricingSectionRowSchema).optional(),
  inclusions: policyArray,
  exclusions: policyArray,
  importantNotes: policyArray,
  paymentPolicy: policyArray,
  usefulTip: policyArray,
  cancellationPolicy: policyArray,
  airlineCancellationPolicy: policyArray,
  termsconditions: policyArray,
  kitchenGroupPolicy: policyArray,
});

export const variantWriteSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  priceModifier: z.coerce.number().optional(),
});

export const variantHotelMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      itineraryId: z.string().min(1),
      hotelId: z.string().min(1),
    })
  ),
});

export const pricingComponentSchema = z.object({
  pricingAttributeId: z.string().min(1),
  price: z.coerce.number().min(0),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const tourPackagePricingWriteSchema = z.object({
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  mealPlanId: z.string().min(1),
  numberOfRooms: z.coerce.number().int().min(1),
  packageVariantId: z.string().optional().nullable(),
  vehicleTypeId: z.string().optional().nullable(),
  locationSeasonalPeriodId: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isGroupPricing: z.boolean().optional(),
  isActive: z.boolean().optional(),
  pricingComponents: z.array(pricingComponentSchema).min(1),
});

export function slugifyTourPackageName(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `package-${Date.now().toString(36)}`;
}

type PackageRow = {
  id: string;
  tourPackageName: string | null;
  tourPackageType: string | null;
  tourCategory: string | null;
  numDaysNight: string | null;
  transport: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  price: string | null;
  slug: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  locationId: string;
  pricingSection: unknown;
  inclusions: unknown;
  exclusions: unknown;
  importantNotes: unknown;
  paymentPolicy: unknown;
  usefulTip: unknown;
  cancellationPolicy: unknown;
  airlineCancellationPolicy: unknown;
  termsconditions: unknown;
  kitchenGroupPolicy: unknown;
  createdAt: Date;
  updatedAt: Date;
  location: { id: string; label: string };
  images?: { id: string; url: string }[];
  itineraries: {
    id: string;
    dayNumber: number | null;
    itineraryTitle: string | null;
    itineraryDescription: string | null;
    mealsIncluded: string | null;
    itineraryImages?: { id: string; url: string }[];
  }[];
  packageVariants?: {
    id: string;
    name: string;
    description: string | null;
    isDefault: boolean;
    sortOrder: number;
    priceModifier: number | null;
    _count?: { tourPackagePricings: number; variantHotelMappings: number };
  }[];
  _count?: { itineraries: number; packageVariants: number; tourPackagePricings: number };
};

export function formatTourPackageDetail(row: PackageRow) {
  const policies = Object.fromEntries(
    ([
      "inclusions",
      "exclusions",
      "importantNotes",
      "paymentPolicy",
      "usefulTip",
      "cancellationPolicy",
      "airlineCancellationPolicy",
      "termsconditions",
      "kitchenGroupPolicy",
    ] as PolicyFieldKey[]).map((key) => [key, parsePolicyField(row[key])])
  ) as Record<PolicyFieldKey, string[]>;

  return {
    id: row.id,
    tourPackageName: row.tourPackageName,
    tourPackageType: row.tourPackageType,
    tourCategory: row.tourCategory,
    numDaysNight: row.numDaysNight,
    transport: row.transport,
    pickup_location: row.pickup_location,
    drop_location: row.drop_location,
    price: row.price,
    slug: row.slug,
    isFeatured: row.isFeatured,
    isArchived: row.isArchived,
    locationId: row.locationId,
    location: row.location,
    images: (row.images ?? []).map((img) => ({ id: img.id, url: img.url })),
    pricingSection: parsePricingSection(row.pricingSection),
    ...policies,
    itineraryCount: row._count?.itineraries ?? row.itineraries.length,
    variantCount: row._count?.packageVariants ?? row.packageVariants?.length ?? 0,
    pricingCount: row._count?.tourPackagePricings ?? 0,
    itineraries: row.itineraries.map((it) => ({
      id: it.id,
      dayNumber: it.dayNumber,
      itineraryTitle: it.itineraryTitle,
      itineraryDescription: it.itineraryDescription,
      mealsIncluded: it.mealsIncluded,
      images: (it.itineraryImages ?? []).map((img) => ({ id: img.id, url: img.url })),
    })),
    variants: (row.packageVariants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      isDefault: v.isDefault,
      sortOrder: v.sortOrder,
      priceModifier: v.priceModifier,
      pricingCount: v._count?.tourPackagePricings ?? 0,
      hotelMappingCount: v._count?.variantHotelMappings ?? 0,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const tourPackageDetailInclude = {
  location: { select: { id: true, label: true } },
  images: { select: { id: true, url: true }, orderBy: { createdAt: "asc" as const } },
  itineraries: {
    select: {
      id: true,
      dayNumber: true,
      itineraryTitle: true,
      itineraryDescription: true,
      mealsIncluded: true,
      itineraryImages: { select: { id: true, url: true }, orderBy: { createdAt: "asc" as const } },
    },
    orderBy: [{ dayNumber: "asc" as const }, { days: "asc" as const }],
  },
  packageVariants: {
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      sortOrder: true,
      priceModifier: true,
      _count: { select: { tourPackagePricings: true, variantHotelMappings: true } },
    },
    orderBy: { sortOrder: "asc" as const },
  },
  _count: {
    select: { itineraries: true, packageVariants: true, tourPackagePricings: true },
  },
};
