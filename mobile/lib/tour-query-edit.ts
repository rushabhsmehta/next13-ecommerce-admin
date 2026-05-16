/**
 * Typed client for editing a tour query's core fields, policy text blocks,
 * and per-day itinerary text. Pairs with PATCH /api/mobile/tour-queries/[id].
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface TourQueryItineraryEdit {
  id: string;
  itineraryTitle?: string;
  itineraryDescription?: string;
  mealsIncluded?: string;
}

export interface TourQueryEditInput {
  tourPackageQueryName?: string;
  customerName?: string;
  customerNumber?: string;
  numAdults?: string;
  numChild5to12?: string;
  numChild0to5?: string;
  /** ISO date string or null to clear */
  tourStartsFrom?: string | null;
  tourEndsOn?: string | null;
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
      });
    },
  };
}

export type TourQueryEditClient = ReturnType<typeof createTourQueryEditClient>;
