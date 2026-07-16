import type { TourQueryEditInput } from "@/lib/tour-query-edit";

export type TourQueryTabId =
  | "basic"
  | "guests"
  | "trip"
  | "flights"
  | "itinerary"
  | "pricing"
  | "variants"
  | "policies";

export type VariantBuildTabId = "hotels" | "rooms" | "pricing";

export type PolicySegmentId = "inclusions" | "notes" | "cancellation" | "terms";

export interface RoomAllocationRow {
  id?: string;
  roomTypeId?: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  quantity: number;
  customRoomType?: string | null;
}

export interface TransportDetailRow {
  id?: string;
  vehicleTypeId: string;
  quantity: number;
  description?: string | null;
}

export interface ActivityImageRow {
  url: string;
}

export interface ActivityRow {
  activityTitle?: string | null;
  activityDescription?: string | null;
  activityImages?: ActivityImageRow[];
}

export interface FlightDetailRow {
  id?: string;
  date?: string | null;
  flightName?: string | null;
  flightNumber?: string | null;
  from?: string | null;
  to?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  flightDuration?: string | null;
  images?: ActivityImageRow[];
}

export interface ItineraryRow {
  id: string;
  dayNumber: number | null;
  days: string | null;
  locationId: string | null;
  hotelId: string | null;
  itineraryTitle: string | null;
  itineraryDescription: string | null;
  mealsIncluded: string | null;
  roomAllocations: RoomAllocationRow[];
  transportDetails: TransportDetailRow[];
  activities: ActivityRow[];
}

export interface TourQueryDetailResponse {
  id: string;
  tourPackageQueryName: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numAdults: string | null;
  numChild5to12: string | null;
  numChild0to5: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  numDaysNight: string | null;
  remarks: string | null;
  transport: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  locationId: string | null;
  location: { id: string; label: string } | null;
  totalPrice: string | null;
  confirmedVariantId: string | null;
  inclusionsList: string[];
  exclusionsList: string[];
  importantNotesList: string[];
  paymentPolicyList: string[];
  usefulTipList: string[];
  cancellationPolicyList: string[];
  airlineCancellationPolicyList: string[];
  termsconditionsList: string[];
  kitchenGroupPolicyList: string[];
  selectedTemplateId: string | null;
  selectedTemplateType: string | null;
  tourPackageTemplateName: string | null;
  selectedVariantIds: string[] | null;
  flightDetails: FlightDetailRow[];
  itineraries: ItineraryRow[];
  inquiry: {
    id: string;
    customerName: string | null;
    customerMobileNumber: string | null;
    status: string | null;
    associatePartnerId: string | null;
    roomAllocations: {
      id: string;
      quantity: number;
      customRoomType: string | null;
      roomTypeId: string;
      occupancyTypeId: string;
      mealPlanId: string | null;
      roomType: { id: string; name: string };
      occupancyType: { id: string; name: string };
      mealPlan?: { id: string; name: string } | null;
    }[];
  } | null;
}

export const POLICY_FIELDS: {
  key: keyof TourQueryEditInput;
  listKey: keyof TourQueryDetailResponse;
  label: string;
  segment: PolicySegmentId;
}[] = [
  { key: "inclusions", listKey: "inclusionsList", label: "Inclusions", segment: "inclusions" },
  { key: "exclusions", listKey: "exclusionsList", label: "Exclusions", segment: "inclusions" },
  {
    key: "importantNotes",
    listKey: "importantNotesList",
    label: "Important notes",
    segment: "notes",
  },
  { key: "paymentPolicy", listKey: "paymentPolicyList", label: "Payment policy", segment: "notes" },
  { key: "usefulTip", listKey: "usefulTipList", label: "Useful tips", segment: "notes" },
  {
    key: "cancellationPolicy",
    listKey: "cancellationPolicyList",
    label: "Cancellation policy",
    segment: "cancellation",
  },
  {
    key: "airlineCancellationPolicy",
    listKey: "airlineCancellationPolicyList",
    label: "Airline cancellation policy",
    segment: "cancellation",
  },
  {
    key: "kitchenGroupPolicy",
    listKey: "kitchenGroupPolicyList",
    label: "Kitchen / group policy",
    segment: "cancellation",
  },
  {
    key: "termsconditions",
    listKey: "termsconditionsList",
    label: "Terms & conditions",
    segment: "terms",
  },
];

export type ActivePickerState =
  | {
      type:
        | "location"
        | "hotel"
        | "roomType"
        | "occupancy"
        | "mealPlan"
        | "vehicleType"
        | "packageTemplate"
        | "copyQuery"
        | "queryLocation";
      dayIndex: number;
      allocationIndex?: number;
      transportIndex?: number;
    }
  | null;

export interface TabBadgeState {
  trip?: boolean;
  itinerary?: number;
  pricing?: boolean;
  variants?: boolean;
}
