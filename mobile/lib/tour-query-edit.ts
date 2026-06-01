/**
 * Typed client for editing a tour query's core fields, policy text blocks,
 * and per-day itinerary text. Pairs with PATCH /api/mobile/tour-queries/[id].
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";
import { TOUR_QUERY_WRITE_TIMEOUT } from "@/lib/api";

export interface RoomAllocationEdit {
  id?: string;
  roomTypeId?: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  quantity?: number;
  customRoomType?: string | null;
}

export interface TourQueryItineraryEdit {
  id?: string;
  dayNumber?: number;
  days?: string;
  locationId?: string;
  hotelId?: string | null;
  itineraryTitle?: string;
  itineraryDescription?: string;
  mealsIncluded?: string;
  roomAllocations?: RoomAllocationEdit[];
  transportDetails?: {
    id?: string;
    vehicleTypeId: string;
    quantity?: number;
    description?: string | null;
  }[];
}

export interface TourQueryPricingItemEdit {
  name?: string;
  price?: string;
  description?: string;
  derivationFormula?: string;
  [key: string]: unknown;
}

export interface TourQueryEditInput {
  tourPackageQueryName?: string;
  customerName?: string;
  customerNumber?: string;
  numAdults?: string;
  numChild5to12?: string;
  numChild0to5?: string;
  price?: string | null;
  pricePerAdult?: string | null;
  pricePerChildOrExtraBed?: string | null;
  pricePerChild5to12YearsNoBed?: string | null;
  pricePerChildwithSeatBelow5Years?: string | null;
  totalPrice?: string | null;
  pricingSection?: TourQueryPricingItemEdit[] | null;
  pricingCalculationMethod?: string | null;
  selectedMealPlanId?: string | null;
  variantPricingData?: Record<string, unknown> | null;
  /** ISO date string or null to clear */
  tourStartsFrom?: string | null;
  tourEndsOn?: string | null;
  locationId?: string | null;
  transport?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  remarks?: string | null;
  inclusions?: string[];
  exclusions?: string[];
  importantNotes?: string[];
  paymentPolicy?: string[];
  usefulTip?: string[];
  cancellationPolicy?: string[];
  airlineCancellationPolicy?: string[];
  termsconditions?: string[];
  kitchenGroupPolicy?: string[];
  selectedTemplateId?: string | null;
  selectedTemplateType?: string | null;
  tourPackageTemplateName?: string | null;
  selectedVariantIds?: string[];
  itineraries?: TourQueryItineraryEdit[];
}

export function createTourQueryEditClient(authRequest: AuthenticatedRequest) {
  return {
    update(
      id: string,
      input: TourQueryEditInput
    ): Promise<{ id: string; updated: boolean }> {
      return authRequest(`/api/mobile/tour-queries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
        timeout: TOUR_QUERY_WRITE_TIMEOUT,
      });
    },
  };
}

export type TourQueryEditClient = ReturnType<typeof createTourQueryEditClient>;
