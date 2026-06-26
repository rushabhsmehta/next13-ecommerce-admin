import type { AuthenticatedRequest } from "@/lib/associate-inquiries";
import { TOUR_QUERY_WRITE_TIMEOUT } from "@/lib/api";

export type SmartBuildRoomAllocation = {
  roomTypeId?: string;
  occupancyTypeId: string;
  quantity: number;
  customRoomType?: string;
  useCustomRoomType?: boolean;
};

export type SmartBuildTransportDetail = {
  vehicleTypeId?: string | null;
  quantity?: number;
  isAirportPickupRequired?: boolean;
  isAirportDropRequired?: boolean;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  requirementDate?: string | null;
  notes?: string | null;
};

export type SmartBuildPrefill = {
  inquiry: {
    id: string;
    customerName: string;
    customerMobileNumber: string;
    locationId: string;
    locationLabel: string;
    numAdults: number;
    numChildren5to11: number;
    numChildrenBelow5: number;
    journeyDate: string | null;
    remarks: string | null;
    associatePartnerId: string | null;
  };
  tourPackages: Array<{
    id: string;
    tourPackageName: string | null;
    tourPackageType: string | null;
    tourCategory: string | null;
    numDaysNight: string | null;
    itineraryCount: number;
    validationErrors: string[];
  }>;
  lookups: {
    mealPlans: Array<{ id: string; name: string }>;
    roomTypes: Array<{ id: string; name: string }>;
    occupancyTypes: Array<{ id: string; name: string; maxPersons?: number | null }>;
    vehicleTypes: Array<{ id: string; name: string }>;
  };
  suggestedRoomAllocations: SmartBuildRoomAllocation[];
  suggestedTransport: SmartBuildTransportDetail[];
};

export type SmartBuildCreateInput = {
  inquiryId: string;
  tourPackageId: string;
  mealPlanId: string;
  roomAllocations: SmartBuildRoomAllocation[];
  transportDetails?: SmartBuildTransportDetail[];
  totalPrice?: number | null;
  tourPackageQueryNumber?: string;
};

export type SmartBuildPriceResult = {
  totalPrice: number | null;
  lines: Array<{
    name: string;
    basePrice: number;
    occupancyMultiplier: number;
    roomQuantity: number;
    totalPrice: number;
    description: string;
  }>;
  pricingSection?: Array<{
    name: string;
    price?: string | null;
    description?: string | null;
  }>;
  error?: string | null;
};

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createSmartQueryBuildClient(authRequest: AuthenticatedRequest) {
  return {
    loadPrefill(inquiryId: string): Promise<SmartBuildPrefill> {
      return authRequest<SmartBuildPrefill>(
        `/api/mobile/tour-queries/smart-build/prefill?inquiryId=${encodeURIComponent(inquiryId)}`,
        { retries: 1 }
      );
    },

    calculatePrice(input: {
      inquiryId: string;
      tourPackageId: string;
      mealPlanId: string;
      roomAllocations: SmartBuildRoomAllocation[];
    }): Promise<SmartBuildPriceResult> {
      return authRequest<SmartBuildPriceResult>(
        "/api/mobile/tour-queries/smart-build/calculate-price",
        {
          method: "POST",
          body: input,
          retries: 1,
        }
      );
    },

    create(input: SmartBuildCreateInput): Promise<{
      id: string;
      tourPackageQueryNumber: string | null;
    }> {
      return authRequest("/api/mobile/tour-queries/smart-build", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("smart-build") },
        timeout: TOUR_QUERY_WRITE_TIMEOUT,
      });
    },
  };
}

export type SmartQueryBuildClient = ReturnType<typeof createSmartQueryBuildClient>;
