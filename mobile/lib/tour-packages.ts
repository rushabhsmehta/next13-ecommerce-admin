/**
 * Typed client for mobile tour package CRUD under Operations.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface TourPackageItineraryDayInput {
  dayNumber: number;
  itineraryTitle: string;
  itineraryDescription?: string | null;
  mealsIncluded?: string | null;
}

export interface TourPackageImageInput {
  url: string;
}

export interface TourPackagePricingSectionRow {
  name: string;
  price?: string | null;
  description?: string | null;
}

export type TourPackagePolicyKey =
  | "inclusions"
  | "exclusions"
  | "importantNotes"
  | "paymentPolicy"
  | "usefulTip"
  | "cancellationPolicy"
  | "airlineCancellationPolicy"
  | "termsconditions"
  | "kitchenGroupPolicy";

export interface TourPackageInput {
  locationId: string;
  tourPackageName: string;
  tourPackageType?: string | null;
  tourCategory?: string | null;
  numDaysNight?: string | null;
  transport?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  price?: string | null;
  itineraries?: TourPackageItineraryDayInput[];
  images?: TourPackageImageInput[];
  pricingSection?: TourPackagePricingSectionRow[];
  inclusions?: string[];
  exclusions?: string[];
  importantNotes?: string[];
  paymentPolicy?: string[];
  usefulTip?: string[];
  cancellationPolicy?: string[];
  airlineCancellationPolicy?: string[];
  termsconditions?: string[];
  kitchenGroupPolicy?: string[];
}

export interface TourPackageListItem {
  id: string;
  tourPackageName: string | null;
  tourPackageType: string | null;
  tourCategory: string | null;
  numDaysNight: string | null;
  price: string | null;
  isArchived: boolean;
  itineraryCount: number;
  updatedAt: string;
  location: { id: string; label: string } | null;
}

export interface TourPackageListResponse {
  packages: TourPackageListItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface TourPackageVariantSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  priceModifier: number | null;
  pricingCount: number;
  hotelMappingCount: number;
}

export interface TourPackageDetail {
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
  location: { id: string; label: string };
  images: { id: string; url: string }[];
  pricingSection: TourPackagePricingSectionRow[];
  inclusions: string[];
  exclusions: string[];
  importantNotes: string[];
  paymentPolicy: string[];
  usefulTip: string[];
  cancellationPolicy: string[];
  airlineCancellationPolicy: string[];
  termsconditions: string[];
  kitchenGroupPolicy: string[];
  itineraryCount: number;
  variantCount: number;
  pricingCount: number;
  itineraries: {
    id: string;
    dayNumber: number | null;
    itineraryTitle: string | null;
    itineraryDescription: string | null;
    mealsIncluded: string | null;
    images?: { id: string; url: string }[];
  }[];
  variants: TourPackageVariantSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TourPackageLookups {
  mealPlans: { id: string; name: string; code: string; description: string | null }[];
  vehicleTypes: { id: string; name: string; description: string | null; capacity: number | null }[];
  pricingAttributes: { id: string; name: string; description: string | null; sortOrder: number }[];
  seasonalPeriods: {
    id: string;
    name: string;
    seasonType: string | null;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    description: string | null;
  }[];
}

export interface PackageVariant {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  priceModifier: number | null;
  tourPackageId: string | null;
  pricingCount: number;
  hotelMappings: {
    id: string;
    itineraryId: string;
    hotelId: string;
    dayNumber: number | null;
    itineraryTitle: string | null;
    hotelName: string;
  }[];
}

export interface PackageVariantInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  sortOrder?: number;
  priceModifier?: number;
}

export interface VariantHotelMappingInput {
  itineraryId: string;
  hotelId: string;
}

export interface PricingComponentInput {
  pricingAttributeId: string;
  price: number;
  purchasePrice?: number | null;
  description?: string | null;
}

export interface TourPackagePricingInput {
  startDate: string;
  endDate: string;
  mealPlanId: string;
  numberOfRooms: number;
  packageVariantId?: string | null;
  vehicleTypeId?: string | null;
  locationSeasonalPeriodId?: string | null;
  description?: string | null;
  isGroupPricing?: boolean;
  isActive?: boolean;
  pricingComponents: PricingComponentInput[];
}

export interface TourPackagePricingRow {
  id: string;
  tourPackageId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string | null;
  numberOfRooms: number;
  isGroupPricing: boolean;
  mealPlanId: string;
  mealPlanName: string;
  mealPlanCode: string;
  packageVariantId: string | null;
  packageVariantName: string | null;
  vehicleTypeId: string | null;
  vehicleTypeName: string | null;
  locationSeasonalPeriodId: string | null;
  seasonalPeriodName: string | null;
  totalPrice: number;
  pricingComponents: {
    id: string;
    pricingAttributeId: string;
    pricingAttributeName: string;
    price: number;
    purchasePrice: number | null;
    description: string | null;
  }[];
}

function idemKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

const READ_CACHE = { cacheTtlSeconds: 45, dedupe: true, staleOnError: true } as const;
const LOOKUP_CACHE = { cacheTtlSeconds: 300, dedupe: true, staleOnError: true } as const;

export function createTourPackagesClient(authRequest: AuthenticatedRequest) {
  return {
    list(
      filters: {
        search?: string;
        locationId?: string;
        includeArchived?: boolean;
        limit?: number;
        offset?: number;
      } = {}
    ): Promise<TourPackageListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.locationId) qs.set("locationId", filters.locationId);
      if (filters.includeArchived) qs.set("includeArchived", "true");
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<TourPackageListResponse>(
        `/api/mobile/tour-packages${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    get(id: string): Promise<TourPackageDetail> {
      return authRequest<TourPackageDetail>(
        `/api/mobile/tour-packages/${encodeURIComponent(id)}`
      );
    },

    getLookups(locationId?: string): Promise<TourPackageLookups> {
      const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
      return authRequest<TourPackageLookups>(
        `/api/mobile/tour-packages/lookups${qs}`,
        LOOKUP_CACHE
      );
    },

    create(input: TourPackageInput): Promise<{ id: string; tourPackage: { id: string; tourPackageName: string | null; locationId: string } }> {
      return authRequest("/api/mobile/tour-packages", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("tour-package-create") },
      });
    },

    update(id: string, input: Partial<TourPackageInput>): Promise<TourPackageDetail> {
      return authRequest<TourPackageDetail>(
        `/api/mobile/tour-packages/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
          headers: { "Idempotency-Key": idemKey("tour-package-update") },
        }
      );
    },

    listVariants(packageId: string): Promise<{ variants: PackageVariant[]; total: number }> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants`,
        READ_CACHE
      );
    },

    getVariant(packageId: string, variantId: string): Promise<PackageVariant> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants/${encodeURIComponent(variantId)}`
      );
    },

    createVariant(packageId: string, input: PackageVariantInput): Promise<PackageVariant> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants`,
        {
          method: "POST",
          body: input,
          headers: { "Idempotency-Key": idemKey("tour-package-variant-create") },
        }
      );
    },

    updateVariant(
      packageId: string,
      variantId: string,
      input: Partial<PackageVariantInput>
    ): Promise<PackageVariant> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants/${encodeURIComponent(variantId)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteVariant(
      packageId: string,
      variantId: string
    ): Promise<{ deleted: boolean; id: string }> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants/${encodeURIComponent(variantId)}`,
        { method: "DELETE" }
      );
    },

    updateVariantHotelMappings(
      packageId: string,
      variantId: string,
      mappings: VariantHotelMappingInput[]
    ): Promise<{ mappings: PackageVariant["hotelMappings"] }> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/variants/${encodeURIComponent(variantId)}/hotel-mappings`,
        { method: "PUT", body: { mappings } }
      );
    },

    listPricing(
      packageId: string,
      filters: {
        startDate?: string;
        endDate?: string;
        packageVariantId?: string;
        includeGlobal?: boolean;
        onlyGlobal?: boolean;
        activeOnly?: boolean;
      } = {}
    ): Promise<{
      package: { id: string; tourPackageName: string | null; locationId: string };
      items: TourPackagePricingRow[];
      total: number;
    }> {
      const qs = new URLSearchParams();
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate) qs.set("endDate", filters.endDate);
      if (filters.packageVariantId) qs.set("packageVariantId", filters.packageVariantId);
      if (filters.includeGlobal === false) qs.set("includeGlobal", "false");
      if (filters.onlyGlobal) qs.set("onlyGlobal", "true");
      if (filters.activeOnly === false) qs.set("activeOnly", "false");
      const q = qs.toString();
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/pricing${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getPricing(packageId: string, pricingId: string): Promise<TourPackagePricingRow> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/pricing/${encodeURIComponent(pricingId)}`
      );
    },

    createPricing(
      packageId: string,
      input: TourPackagePricingInput
    ): Promise<TourPackagePricingRow> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/pricing`,
        {
          method: "POST",
          body: input,
          headers: { "Idempotency-Key": idemKey("tour-package-pricing-create") },
        }
      );
    },

    updatePricing(
      packageId: string,
      pricingId: string,
      input: Partial<TourPackagePricingInput>
    ): Promise<TourPackagePricingRow> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/pricing/${encodeURIComponent(pricingId)}`,
        { method: "PATCH", body: input }
      );
    },

    deletePricing(
      packageId: string,
      pricingId: string
    ): Promise<{ deleted: boolean; id: string }> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(packageId)}/pricing/${encodeURIComponent(pricingId)}`,
        { method: "DELETE" }
      );
    },

    delete(id: string): Promise<{ deleted: boolean; id: string }> {
      return authRequest(
        `/api/mobile/tour-packages/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };
}

export type TourPackagesClient = ReturnType<typeof createTourPackagesClient>;
