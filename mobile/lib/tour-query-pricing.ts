/**
 * Typed client for tour-query variant pricing comparison.
 * Read-only: pricing is computed and persisted server-side; mobile compares.
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

export function createTourQueryPricingClient(authRequest: AuthenticatedRequest) {
  return {
    compare(tourQueryId: string): Promise<VariantComparisonResponse> {
      return authRequest<VariantComparisonResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/variants`
      );
    },
  };
}

export type TourQueryPricingClient = ReturnType<
  typeof createTourQueryPricingClient
>;
