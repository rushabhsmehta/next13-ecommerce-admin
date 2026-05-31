/**
 * Typed client for the mobile Operations module. Operations master data is
 * `draft_only` (no balance/financial risk); writes are still idempotent so a
 * flaky retry can't create duplicate master records.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  gstNumber: string | null;
  address: string | null;
}

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface SupplierDetail {
  supplier: Supplier;
  summary: { purchaseCount: number };
  recentPurchases: {
    id: string;
    billNumber: string | null;
    price: number;
    gstAmount: number | null;
    purchaseDate: string;
  }[];
}

export interface SupplierInput {
  name: string;
  contact?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  address?: string | null;
}

function idemKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

const READ_CACHE = { cacheTtlSeconds: 45, dedupe: true, staleOnError: true } as const;
const LOOKUP_CACHE = { cacheTtlSeconds: 300, dedupe: true, staleOnError: true } as const;

export function createOperationsClient(authRequest: AuthenticatedRequest) {
  return {
    listSuppliers(filters: {
      search?: string;
      limit?: number;
      offset?: number;
    } = {}): Promise<SupplierListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<SupplierListResponse>(
        `/api/mobile/operations/suppliers${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getSupplier(id: string): Promise<SupplierDetail> {
      return authRequest<SupplierDetail>(
        `/api/mobile/operations/suppliers/${encodeURIComponent(id)}`
      );
    },

    createSupplier(input: SupplierInput): Promise<{ id: string; name: string }> {
      return authRequest("/api/mobile/operations/suppliers", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("supplier-create") },
      });
    },

    updateSupplier(
      id: string,
      input: SupplierInput
    ): Promise<{ id: string; name: string }> {
      return authRequest(
        `/api/mobile/operations/suppliers/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteSupplier(
      id: string
    ): Promise<{ deleted: boolean; supplier: { id: string; name: string } }> {
      return authRequest(
        `/api/mobile/operations/suppliers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listStaff(filters: { search?: string; activeOnly?: boolean } = {}): Promise<{
      staff: OperationalStaffMember[];
      total: number;
    }> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.activeOnly) qs.set("activeOnly", "true");
      const q = qs.toString();
      return authRequest(
        `/api/mobile/operations/staff${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getStaff(id: string): Promise<{
      staff: OperationalStaffMember;
      summary: { assignedInquiries: number };
    }> {
      return authRequest(
        `/api/mobile/operations/staff/${encodeURIComponent(id)}`
      );
    },

    createStaff(input: StaffCreateInput): Promise<OperationalStaffMember> {
      return authRequest("/api/mobile/operations/staff", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("staff-create") },
      });
    },

    updateStaff(
      id: string,
      input: StaffUpdateInput
    ): Promise<OperationalStaffMember> {
      return authRequest(
        `/api/mobile/operations/staff/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteStaff(
      id: string
    ): Promise<{
      deleted?: boolean;
      deactivated?: boolean;
      staff: { id: string; name: string };
    }> {
      return authRequest(
        `/api/mobile/operations/staff/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listTransportPricing(
      filters: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<TransportPricingListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<TransportPricingListResponse>(
        `/api/mobile/operations/transport-pricing${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getTransportPricing(id: string): Promise<TransportPricingDetail> {
      return authRequest<TransportPricingDetail>(
        `/api/mobile/operations/transport-pricing/${encodeURIComponent(id)}`
      );
    },

    createTransportPricing(
      input: TransportPricingInput
    ): Promise<{ id: string; locationId: string; price: number; transportType: string }> {
      return authRequest("/api/mobile/operations/transport-pricing", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("transport-pricing-create") },
      });
    },

    updateTransportPricing(
      id: string,
      input: Partial<TransportPricingInput>
    ): Promise<{ id: string; locationId: string; price: number; transportType: string }> {
      return authRequest(
        `/api/mobile/operations/transport-pricing/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteTransportPricing(
      id: string
    ): Promise<{
      deleted: boolean;
      transportPricing: { id: string; locationId: string; transportType: string };
    }> {
      return authRequest(
        `/api/mobile/operations/transport-pricing/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listVehicleTypes(
      filters: { search?: string; activeOnly?: boolean } = {}
    ): Promise<VehicleTypeListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.activeOnly) qs.set("activeOnly", "true");
      const q = qs.toString();
      return authRequest<VehicleTypeListResponse>(
        `/api/mobile/operations/vehicle-types${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getVehicleType(id: string): Promise<VehicleTypeDetail> {
      return authRequest<VehicleTypeDetail>(
        `/api/mobile/operations/vehicle-types/${encodeURIComponent(id)}`
      );
    },

    createVehicleType(input: VehicleTypeInput): Promise<VehicleType> {
      return authRequest("/api/mobile/operations/vehicle-types", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("vehicle-type-create") },
      });
    },

    updateVehicleType(id: string, input: VehicleTypeUpdateInput): Promise<VehicleType> {
      return authRequest(
        `/api/mobile/operations/vehicle-types/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteVehicleType(
      id: string
    ): Promise<{
      deleted?: boolean;
      deactivated?: boolean;
      vehicleType: { id: string; name: string };
    }> {
      return authRequest(
        `/api/mobile/operations/vehicle-types/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listLocations(
      filters: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<LocationListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<LocationListResponse>(
        `/api/mobile/operations/locations${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getLocation(id: string): Promise<LocationDetail> {
      return authRequest<LocationDetail>(
        `/api/mobile/operations/locations/${encodeURIComponent(id)}`
      );
    },

    createLocation(input: LocationInput): Promise<{ id: string; label: string }> {
      return authRequest("/api/mobile/operations/locations", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("location-create") },
      });
    },

    updateLocation(id: string, input: LocationInput): Promise<{ id: string; label: string }> {
      return authRequest(
        `/api/mobile/operations/locations/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteLocation(
      id: string
    ): Promise<{ deleted: boolean; location: { id: string; label: string } }> {
      return authRequest(
        `/api/mobile/operations/locations/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listDestinations(
      filters: {
        search?: string;
        locationId?: string;
        limit?: number;
        offset?: number;
      } = {}
    ): Promise<DestinationListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.locationId) qs.set("locationId", filters.locationId);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<DestinationListResponse>(
        `/api/mobile/operations/destinations${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getDestination(id: string): Promise<DestinationDetail> {
      return authRequest<DestinationDetail>(
        `/api/mobile/operations/destinations/${encodeURIComponent(id)}`
      );
    },

    createDestination(
      input: DestinationInput
    ): Promise<{ id: string; name: string }> {
      return authRequest("/api/mobile/operations/destinations", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("destination-create") },
      });
    },

    updateDestination(
      id: string,
      input: DestinationInput
    ): Promise<{ id: string; name: string }> {
      return authRequest(
        `/api/mobile/operations/destinations/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteDestination(
      id: string
    ): Promise<{ deleted: boolean; destination: { id: string; name: string } }> {
      return authRequest(
        `/api/mobile/operations/destinations/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listHotels(
      filters: {
        search?: string;
        locationId?: string;
        destinationId?: string;
        limit?: number;
        offset?: number;
      } = {}
    ): Promise<HotelListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.locationId) qs.set("locationId", filters.locationId);
      if (filters.destinationId) qs.set("destinationId", filters.destinationId);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<HotelListResponse>(
        `/api/mobile/operations/hotels${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getHotel(id: string): Promise<HotelDetail> {
      return authRequest<HotelDetail>(
        `/api/mobile/operations/hotels/${encodeURIComponent(id)}`
      );
    },

    createHotel(input: HotelInput): Promise<{ id: string; name: string }> {
      return authRequest("/api/mobile/operations/hotels", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("hotel-create") },
      });
    },

    updateHotel(id: string, input: HotelInput): Promise<{ id: string; name: string }> {
      return authRequest(
        `/api/mobile/operations/hotels/${encodeURIComponent(id)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteHotel(
      id: string
    ): Promise<{ deleted: boolean; hotel: { id: string; name: string } }> {
      return authRequest(
        `/api/mobile/operations/hotels/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },

    listHotelPricing(
      hotelId: string,
      filters: {
        startDate?: string;
        endDate?: string;
        activeOnly?: boolean;
      } = {}
    ): Promise<HotelPricingListResponse> {
      const qs = new URLSearchParams();
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate) qs.set("endDate", filters.endDate);
      if (filters.activeOnly === false) qs.set("activeOnly", "false");
      const q = qs.toString();
      return authRequest<HotelPricingListResponse>(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getHotelPricing(
      hotelId: string,
      pricingId: string
    ): Promise<HotelPricingDetailResponse> {
      return authRequest<HotelPricingDetailResponse>(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing/${encodeURIComponent(pricingId)}`
      );
    },

    getHotelPricingLookups(): Promise<HotelPricingLookups> {
      return authRequest<HotelPricingLookups>(
        "/api/mobile/operations/pricing-lookups",
        LOOKUP_CACHE
      );
    },

    checkHotelPricingOverlap(
      hotelId: string,
      input: HotelPricingInput & { excludeId?: string | null }
    ): Promise<HotelPricingSplitPreview> {
      return authRequest<HotelPricingSplitPreview>(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing/check-overlap`,
        { method: "POST", body: input }
      );
    },

    createHotelPricing(
      hotelId: string,
      input: HotelPricingInput
    ): Promise<HotelPricingRow> {
      return authRequest(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing`,
        {
          method: "POST",
          body: input,
          headers: { "Idempotency-Key": idemKey("hotel-pricing-create") },
        }
      );
    },

    updateHotelPricing(
      hotelId: string,
      pricingId: string,
      input: HotelPricingInput
    ): Promise<HotelPricingRow> {
      return authRequest(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing/${encodeURIComponent(pricingId)}`,
        { method: "PATCH", body: input }
      );
    },

    deleteHotelPricing(
      hotelId: string,
      pricingId: string
    ): Promise<{ deleted: boolean; pricing: { id: string; hotelId: string } }> {
      return authRequest(
        `/api/mobile/operations/hotels/${encodeURIComponent(hotelId)}/pricing/${encodeURIComponent(pricingId)}`,
        { method: "DELETE" }
      );
    },

    listItineraries(
      filters: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<OpsMasterListResponse<OpsItineraryMaster>> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest(
        `/api/mobile/operations/itineraries${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getItinerary(id: string): Promise<OpsItineraryMaster> {
      return authRequest(`/api/mobile/operations/itineraries/${encodeURIComponent(id)}`);
    },

    createItinerary(input: OpsItineraryInput): Promise<OpsItineraryMaster> {
      return authRequest("/api/mobile/operations/itineraries", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("itinerary-master-create") },
      });
    },

    updateItinerary(id: string, input: OpsItineraryInput): Promise<OpsItineraryMaster> {
      return authRequest(`/api/mobile/operations/itineraries/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
      });
    },

    deleteItinerary(id: string): Promise<{ deleted: boolean }> {
      return authRequest(`/api/mobile/operations/itineraries/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    listActivities(
      filters: { search?: string; limit?: number; offset?: number } = {}
    ): Promise<OpsMasterListResponse<OpsActivityMaster>> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest(
        `/api/mobile/operations/activities${q ? `?${q}` : ""}`,
        READ_CACHE
      );
    },

    getActivity(id: string): Promise<OpsActivityMaster> {
      return authRequest(`/api/mobile/operations/activities/${encodeURIComponent(id)}`);
    },

    createActivity(input: OpsActivityInput): Promise<OpsActivityMaster> {
      return authRequest("/api/mobile/operations/activities", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("activity-master-create") },
      });
    },

    updateActivity(id: string, input: OpsActivityInput): Promise<OpsActivityMaster> {
      return authRequest(`/api/mobile/operations/activities/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
      });
    },

    deleteActivity(id: string): Promise<{ deleted: boolean }> {
      return authRequest(`/api/mobile/operations/activities/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    listLocationSuppliers(view: "location" | "supplier" = "location"): Promise<{
      items: SupplierLocationRelation[];
      total: number;
      view: string;
    }> {
      return authRequest(
        `/api/mobile/operations/location-suppliers?view=${view}`,
        READ_CACHE
      );
    },

    createLocationSupplier(input: {
      locationId: string;
      supplierId: string;
    }): Promise<SupplierLocationRelation> {
      return authRequest("/api/mobile/operations/location-suppliers", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": idemKey("supplier-location-create") },
      });
    },

    deleteLocationSupplier(id: string): Promise<{ deleted: boolean }> {
      return authRequest(
        `/api/mobile/operations/location-suppliers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };
}

export type OperationalStaffRole = "OPERATIONS" | "ADMIN";

export interface OperationalStaffMember {
  id: string;
  name: string;
  email: string;
  role: OperationalStaffRole;
  isActive: boolean;
  createdAt?: string;
}

export interface StaffCreateInput {
  name: string;
  email: string;
  password: string;
  role?: OperationalStaffRole;
  isActive?: boolean;
}

export interface StaffUpdateInput {
  name: string;
  email: string;
  role?: OperationalStaffRole;
  isActive?: boolean;
  /** Optional — only sent when changing the password. */
  password?: string | null;
}

export type TransportType = "PerDay" | "PerTrip";

export interface TransportPricing {
  id: string;
  locationId: string;
  locationLabel: string;
  vehicleTypeId: string | null;
  vehicleTypeName: string | null;
  price: number;
  transportType: TransportType;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface TransportPricingListResponse {
  items: TransportPricing[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface TransportPricingDetail {
  transportPricing: TransportPricing & {
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface TransportPricingInput {
  locationId: string;
  vehicleTypeId: string;
  price: number;
  transportType: TransportType;
  description?: string | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface VehicleType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface VehicleTypeListResponse {
  items: VehicleType[];
  total: number;
}

export interface VehicleTypeDetail {
  vehicleType: VehicleType & { updatedAt?: string };
  summary: {
    transportPricingsCount: number;
    transportDetailsCount: number;
    usageCount: number;
  };
}

export interface VehicleTypeInput {
  name: string;
  description?: string | null;
}

export interface VehicleTypeUpdateInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface OpsLocation {
  id: string;
  label: string;
  imageUrl: string;
  slug: string | null;
  tags: string | null;
  isActive: boolean;
  createdAt?: string;
  destinationCount?: number;
  hotelCount?: number;
}

export interface LocationListResponse {
  items: OpsLocation[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface LocationDetail {
  location: OpsLocation & { updatedAt?: string };
  summary: {
    hotels: number;
    destinations: number;
    transportPricings: number;
    tourPackages: number;
    tourPackageQueries: number;
    inquiries: number;
    linkedCount: number;
  };
}

export interface LocationInput {
  label: string;
  imageUrl: string;
  slug?: string | null;
  tags?: string | null;
  isActive?: boolean;
}

export interface OpsDestination {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  locationId: string;
  locationLabel: string;
  isActive: boolean;
  createdAt?: string;
  hotelCount?: number;
}

export interface DestinationListResponse {
  items: OpsDestination[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface DestinationDetail {
  destination: OpsDestination & { updatedAt?: string };
  summary: { hotelCount: number };
}

export interface DestinationInput {
  name: string;
  locationId: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface OpsHotel {
  id: string;
  name: string;
  link: string | null;
  locationId: string;
  locationLabel: string;
  destinationId: string | null;
  destinationName: string | null;
  heroImageUrl: string | null;
  imageCount?: number;
  pricingCount?: number;
  createdAt?: string;
}

export interface HotelListResponse {
  items: OpsHotel[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface HotelDetail {
  hotel: {
    id: string;
    name: string;
    link: string | null;
    locationId: string;
    locationLabel: string;
    destinationId: string | null;
    destinationName: string | null;
    images: { url: string }[];
    createdAt?: string;
    updatedAt?: string;
  };
  summary: {
    pricingCount: number;
    itineraryCount: number;
    itineraryMasterCount: number;
    variantMappings: number;
    variantSnapshots: number;
    linkedCount: number;
  };
}

export interface HotelInput {
  name: string;
  locationId: string;
  destinationId?: string | null;
  link?: string | null;
  images: { url: string }[];
}

export interface HotelPricingRow {
  id: string;
  hotelId: string;
  startDate: string;
  endDate: string;
  price: number;
  isActive: boolean;
  roomTypeId: string | null;
  roomTypeName: string | null;
  occupancyTypeId: string | null;
  occupancyTypeName: string | null;
  mealPlanId: string | null;
  mealPlanName: string | null;
  mealPlanCode: string | null;
}

export interface HotelPricingInput {
  startDate: string;
  endDate: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  price: number;
  isActive?: boolean;
  applySplit?: boolean;
}

export interface HotelPricingSplitPreview {
  willSplit: boolean;
  affectedPeriods: {
    id: string;
    startDate: string;
    endDate: string;
    price: number;
    roomType: string;
    occupancy: string;
    mealPlan?: string;
  }[];
  resultingPeriods: {
    startDate: string;
    endDate: string;
    price: number;
    isNew: boolean;
    isExisting: boolean;
  }[];
  message: string;
}

export interface OpsMasterListResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface OpsImageInput {
  url: string;
}

export interface OpsItineraryMaster {
  id: string;
  title: string | null;
  description: string | null;
  locationId: string;
  locationLabel: string | null;
  dayNumber: number | null;
  days: string | null;
  hotelId: string | null;
  hotelName: string | null;
  roomTypeId?: string | null;
  occupancyTypeId?: string | null;
  mealPlanId?: string | null;
  numberofRooms?: string | null;
  roomCategory?: string | null;
  mealsIncluded?: string | null;
  images?: { id?: string; url: string }[];
}

export interface OpsItineraryInput {
  locationId: string;
  itineraryMasterTitle: string;
  itineraryMasterDescription: string;
  dayNumber?: number | null;
  days?: string | null;
  hotelId?: string | null;
  roomTypeId?: string | null;
  occupancyTypeId?: string | null;
  mealPlanId?: string | null;
  numberofRooms?: string | null;
  roomCategory?: string | null;
  mealsIncluded?: string | null;
  images?: OpsImageInput[];
}

export interface OpsActivityMaster {
  id: string;
  title: string | null;
  description: string | null;
  locationId: string;
  locationLabel: string | null;
  itineraryId?: string | null;
  images?: { id?: string; url: string }[];
}

export interface OpsActivityInput {
  locationId: string;
  activityMasterTitle: string;
  activityMasterDescription: string;
  itineraryId?: string | null;
  images?: OpsImageInput[];
}

export interface SupplierLocationRelation {
  id: string;
  locationId: string;
  locationLabel: string | null;
  supplierId: string;
  supplierName: string | null;
  supplierContact: string | null;
  supplierEmail: string | null;
  createdAt?: string;
}

export interface HotelPricingListResponse {
  hotel: { id: string; name: string; locationId: string };
  items: HotelPricingRow[];
  total: number;
}

export interface HotelPricingDetailResponse {
  hotel: { id: string; name: string; locationId: string };
  pricing: HotelPricingRow & {
    roomTypeDescription: string | null;
    occupancyMaxPersons: number | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface HotelPricingLookups {
  roomTypes: { id: string; name: string; description: string | null }[];
  occupancyTypes: {
    id: string;
    name: string;
    description: string | null;
    maxPersons: number;
  }[];
  mealPlans: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  }[];
}

export type OperationsClient = ReturnType<typeof createOperationsClient>;
