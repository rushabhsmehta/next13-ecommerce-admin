/**
 * Typed client for tour-query variant pricing.
 *
 * Reads (compare) and limited writes (confirm a variant, request a server
 * recalculation with a new markup). Heavy variant editing — room
 * allocations, transport composition — stays on the web; the server remains
 * the pricing source of truth.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface VariantPricingBreakdown {
  totalCost: number;
  basePrice: number;
  markupPercentage: number;
  markupAmount: number;
  accommodation: number;
  transport: number;
  calculatedAt: string | null;
}

export interface VariantComparisonItem {
  id: string;
  name: string;
  sortOrder: number | null;
  sourceVariantId: string | null;
  isConfirmed: boolean;
  pricing: VariantPricingBreakdown | null;
}

export interface VariantComparisonResponse {
  tourPackageQueryId: string;
  confirmedVariantId: string | null;
  hasPricing: boolean;
  variants: VariantComparisonItem[];
}

export interface RecalculateVariantResponse {
  variantId: string;
  pricing: VariantPricingBreakdown;
}

export function createTourQueryPricingClient(authRequest: AuthenticatedRequest) {
  return {
    compare(tourQueryId: string): Promise<VariantComparisonResponse> {
      return authRequest<VariantComparisonResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants`
      );
    },

    confirm(tourQueryId: string, variantId: string | null) {
      return authRequest<{ confirmedVariantId: string | null }>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants/confirm`,
        { method: "POST", body: { variantId } }
      );
    },

    recalculate(tourQueryId: string, variantId: string, markup: number) {
      return authRequest<RecalculateVariantResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants/recalculate`,
        { method: "POST", body: { variantId, markup } }
      );
    },
  };
}

export type TourQueryPricingClient = ReturnType<
  typeof createTourQueryPricingClient
>;
