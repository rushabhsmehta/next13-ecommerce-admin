/**
 * Typed client for tour-query variant pricing comparison and edits.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";
import { TOUR_QUERY_WRITE_TIMEOUT } from "@/lib/api";

export interface VariantPricingComponent {
  name: string;
  price: string;
  description: string;
  [key: string]: unknown;
}

export type VariantCalculationMethod =
  | "manual"
  | "autoHotelTransport"
  | "useTourPackagePricing";

export type AppliedVariantDiscountPayload = {
  type: "percent" | "fixed";
  inputValue: number;
  amount: number;
  reason?: string | null;
};

export interface VariantPricingQueryContext {
  selectedTemplateId: string | null;
  tourPackageTemplateName: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  numAdults: number;
  numChild5to12: number;
  numChild0to5: number;
}

export interface VariantPricingBreakdown {
  calculationMethod: string | null;
  components: VariantPricingComponent[];
  componentsBeforeDiscount?: VariantPricingComponent[];
  remarks: string | null;
  totalCost: number;
  basePrice: number;
  markupPercentage: number;
  markupAmount: number;
  accommodation: number;
  transport: number;
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  calculatedAt: string | null;
  subtotalBeforeDiscount?: number | null;
  appliedDiscount?: AppliedVariantDiscountPayload | null;
  discountAmount?: number;
}

export interface VariantComparisonItem {
  id: string;
  name: string;
  sortOrder: number | null;
  sourceVariantId: string | null;
  isConfirmed: boolean;
  isCustom?: boolean;
  pricing: VariantPricingBreakdown | null;
  hotelSnapshots: Array<{
    dayNumber: number;
    hotelId: string;
    hotelName: string;
  }>;
}

export interface VariantBuildItinerary {
  id: string;
  dayNumber: number | null;
  itineraryTitle: string | null;
  locationId: string | null;
  hotel: { id: string; name: string } | null;
}

export interface VariantBuildLookups {
  roomTypes: Array<{ id: string; name: string }>;
  occupancyTypes: Array<{ id: string; name: string }>;
  mealPlans: Array<{ id: string; name: string }>;
  vehicleTypes: Array<{ id: string; name: string }>;
}

export interface VariantBuildContext {
  itineraries: VariantBuildItinerary[];
  variantRoomAllocations: Record<string, unknown>;
  variantTransportDetails: Record<string, unknown>;
  variantHotelOverrides: Record<string, unknown>;
  lookups: VariantBuildLookups;
}

export interface VariantRoomAllocationInput {
  roomTypeId?: string | null;
  occupancyTypeId?: string | null;
  mealPlanId?: string | null;
  quantity?: number;
  customRoomType?: string | null;
  useCustomRoomType?: boolean;
  guestNames?: string | null;
  voucherNumber?: string | null;
  extraBeds?: Array<{
    occupancyTypeId?: string | null;
    quantity?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface VariantTransportDetailInput {
  vehicleTypeId?: string | null;
  quantity?: number;
  description?: string | null;
  [key: string]: unknown;
}

export interface VariantBuildUpdateInput {
  roomsByItinerary?: Record<string, VariantRoomAllocationInput[]>;
  transportByItinerary?: Record<string, VariantTransportDetailInput[]>;
  hotelsByItinerary?: Record<string, string>;
}

export interface VariantBuildDraft {
  roomsByItinerary: Record<string, VariantRoomAllocationInput[]>;
  transportByItinerary: Record<string, VariantTransportDetailInput[]>;
  hotelsByItinerary: Record<string, string>;
}

export interface VariantBuildUpdateResponse {
  tourPackageQueryId: string;
  variant: {
    id: string;
    sourceVariantId: string | null;
    name: string;
    sortOrder: number | null;
  };
  build: Pick<
    VariantBuildContext,
    "variantRoomAllocations" | "variantTransportDetails" | "variantHotelOverrides"
  >;
}

export interface VariantComparisonResponse {
  tourPackageQueryId: string;
  confirmedVariantId: string | null;
  hasPricing: boolean;
  variants: VariantComparisonItem[];
  build: VariantBuildContext | null;
}

export interface VariantPricingDetailResponse {
  tourPackageQueryId: string;
  variant: {
    id: string;
    sourceVariantId: string | null;
    name: string;
    sortOrder: number | null;
  };
  pricing: VariantPricingBreakdown | null;
  queryContext?: VariantPricingQueryContext;
}

export interface VariantPricingCalculationResponse {
  calculationMethod: string;
  pricingSection: VariantPricingComponent[];
  totalCost: number;
  basePrice: number;
  subtotalBeforeDiscount?: number;
  appliedMarkup: { percentage: number; amount: number };
  breakdown: { accommodation: number; transport: number };
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  calculatedAt?: string;
}

export interface PackagePricingComponentRow {
  id: string;
  pricingAttributeId: string;
  pricingAttributeName: string;
  price: number;
  description: string | null;
  pricingAttribute: { id: string; name: string; sortOrder: number };
}

export interface VariantPackageComponentsResponse {
  tourPackageQueryId: string;
  variantId: string;
  packageVariantId: string;
  selectedTemplateId: string;
  tourPackageTemplateName: string | null;
  matchedPeriod: {
    id: string;
    startDate: string;
    endDate: string;
    mealPlanId: string;
    mealPlanName: string;
    numberOfRooms: number;
  };
  components: PackagePricingComponentRow[];
}

export interface VariantPricingUpdateInput {
  calculationMethod?: string | null;
  components?: VariantPricingComponent[];
  componentsBeforeDiscount?: VariantPricingComponent[];
  totalCost?: number;
  basePrice?: number;
  appliedMarkup?: { percentage?: number; amount?: number };
  breakdown?: { accommodation?: number; transport?: number };
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  remarks?: string | null;
  subtotalBeforeDiscount?: number;
  appliedDiscount?: AppliedVariantDiscountPayload | null;
}

export interface CustomQueryVariantInput {
  name: string;
  description?: string | null;
}

export interface CustomQueryVariantResponse {
  tourPackageQueryId: string;
  variant: {
    id: string;
    name: string;
    description?: string;
    sortOrder: number | null;
    sourceVariantId: null;
    isCustom: true;
  };
  customQueryVariants: Array<{
    id: string;
    name: string;
    description: string;
    sortOrder: number | null;
  }>;
}

export function createTourQueryPricingClient(authRequest: AuthenticatedRequest) {
  return {
    compare(tourQueryId: string): Promise<VariantComparisonResponse> {
      return authRequest<VariantComparisonResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants`
      );
    },
    confirmVariant(
      tourQueryId: string,
      confirmedVariantId: string | null
    ): Promise<VariantComparisonResponse> {
      return authRequest<VariantComparisonResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants`,
        {
          method: "PATCH",
          body: { confirmedVariantId },
        }
      );
    },
    createCustomVariant(
      tourQueryId: string,
      input: CustomQueryVariantInput
    ): Promise<CustomQueryVariantResponse> {
      return authRequest<CustomQueryVariantResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/custom-variants`,
        {
          method: "POST",
          body: input,
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
    updateCustomVariant(
      tourQueryId: string,
      customVariantId: string,
      input: CustomQueryVariantInput
    ): Promise<CustomQueryVariantResponse> {
      return authRequest<CustomQueryVariantResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/custom-variants/${encodeURIComponent(customVariantId)}`,
        {
          method: "PATCH",
          body: input,
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
    deleteCustomVariant(
      tourQueryId: string,
      customVariantId: string
    ): Promise<{
      tourPackageQueryId: string;
      deletedVariantId: string;
      customQueryVariants: unknown[];
      confirmedVariantId: string | null;
    }> {
      return authRequest(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/custom-variants/${encodeURIComponent(customVariantId)}`,
        {
          method: "DELETE",
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
    getVariantPricing(
      tourQueryId: string,
      variantId: string
    ): Promise<VariantPricingDetailResponse> {
      return authRequest<VariantPricingDetailResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/variants/${encodeURIComponent(variantId)}/pricing`
      );
    },
    updateVariantPricing(
      tourQueryId: string,
      variantId: string,
      input: VariantPricingUpdateInput
    ): Promise<VariantPricingDetailResponse> {
      return authRequest<VariantPricingDetailResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/variants/${encodeURIComponent(variantId)}/pricing`,
        {
          method: "PATCH",
          body: input,
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
    calculateVariantPricing(
      tourQueryId: string,
      variantId: string,
      input: { markup?: number }
    ): Promise<VariantPricingCalculationResponse> {
      return authRequest<VariantPricingCalculationResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/variants/${encodeURIComponent(variantId)}/pricing`,
        {
          method: "POST",
          body: input,
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
    fetchPackagePricingComponents(
      tourQueryId: string,
      variantId: string,
      input: { mealPlanId: string; numberOfRooms: number }
    ): Promise<VariantPackageComponentsResponse> {
      const qs = new URLSearchParams({
        mealPlanId: input.mealPlanId,
        numberOfRooms: String(input.numberOfRooms),
      });
      return authRequest<VariantPackageComponentsResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/variants/${encodeURIComponent(variantId)}/pricing/package-components?${qs.toString()}`
      );
    },
    updateVariantBuild(
      tourQueryId: string,
      variantId: string,
      input: VariantBuildUpdateInput
    ): Promise<VariantBuildUpdateResponse> {
      return authRequest<VariantBuildUpdateResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(
          tourQueryId
        )}/variants/${encodeURIComponent(variantId)}/build`,
        {
          method: "PATCH",
          body: input,
          timeout: TOUR_QUERY_WRITE_TIMEOUT,
        }
      );
    },
  };
}

export type TourQueryPricingClient = ReturnType<
  typeof createTourQueryPricingClient
>;
