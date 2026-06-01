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

export interface VariantPricingBreakdown {
  calculationMethod: string | null;
  components: VariantPricingComponent[];
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
}

export interface VariantComparisonItem {
  id: string;
  name: string;
  sortOrder: number | null;
  sourceVariantId: string | null;
  isConfirmed: boolean;
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
}

export interface VariantPricingCalculationResponse {
  calculationMethod: string;
  pricingSection: VariantPricingComponent[];
  totalCost: number;
  basePrice: number;
  appliedMarkup: { percentage: number; amount: number };
  breakdown: { accommodation: number; transport: number };
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  calculatedAt?: string;
}

export interface VariantPricingUpdateInput {
  calculationMethod?: string | null;
  components?: VariantPricingComponent[];
  totalCost?: number;
  basePrice?: number;
  appliedMarkup?: { percentage?: number; amount?: number };
  breakdown?: { accommodation?: number; transport?: number };
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  remarks?: string | null;
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
  };
}

export type TourQueryPricingClient = ReturnType<
  typeof createTourQueryPricingClient
>;
