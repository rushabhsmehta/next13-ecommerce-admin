import { fetchCrmInquiriesList } from "@/lib/crm-inquiries-list";

/** Same signature as `withAuth(...)` return type — required because `/api/locations` is Clerk-protected. */
export type AuthenticatedRequest = <T = any>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    body?: any;
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
    idempotencyKey?: string;
    signal?: AbortSignal;
    cacheKey?: string;
    cacheTtlSeconds?: number;
    dedupe?: boolean;
    staleOnError?: boolean;
    requireOnline?: boolean;
  }
) => Promise<T>;

export interface InquiryActionItem {
  id: string;
  actionType: string;
  remarks: string;
  actionDate: string;
  createdAt: string;
}

export interface AssociateInquiry {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  status: string;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; label: string } | null;
  associatePartner?: { id: string; name: string } | null;
  actions?: InquiryActionItem[];
}

export interface InquiryRoomAllocationPayload {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  quantity: number;
  guestNames?: string | null;
  notes?: string | null;
}

export interface InquiryTransportPayload {
  vehicleTypeId: string;
  quantity: number;
  isAirportPickupRequired?: boolean;
  isAirportDropRequired?: boolean;
  pickupLocation?: string | null;
  dropLocation?: string | null;
  /** ISO date string YYYY-MM-DD when required */
  requirementDate?: string | null;
  notes?: string | null;
}

export interface AssociateInquiryInput {
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  journeyDate: string;
  numAdults?: number;
  numChildrenAbove11?: number;
  numChildren5to11?: number;
  numChildrenBelow5?: number;
  remarks?: string;
  nextFollowUpDate?: string;
  /** Admin-only: link inquiry to an associate partner. */
  associatePartnerId?: string;
  roomAllocations?: InquiryRoomAllocationPayload[];
  transportDetails?: InquiryTransportPayload[];
}

export interface AssociateInquiryUpdateInput {
  customerName: string;
  customerMobileNumber: string;
  locationId: string;
  journeyDate: string;
  status: string;
  numAdults?: number;
  remarks?: string;
  nextFollowUpDate?: string | null;
}

export interface LocationOption {
  id: string;
  label: string;
}

export function createAssociateInquiryClient(
  authRequest: <T = any>(
    endpoint: string,
    options?: {
      method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
      body?: any;
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
      idempotencyKey?: string;
      signal?: AbortSignal;
      cacheKey?: string;
      cacheTtlSeconds?: number;
      dedupe?: boolean;
      staleOnError?: boolean;
      requireOnline?: boolean;
    }
  ) => Promise<T>
) {
  return {
    async listInquiries(): Promise<AssociateInquiry[]> {
      const { items } = await fetchCrmInquiriesList(authRequest, "limit=100", {
        retries: 1,
        cacheTtlSeconds: 20,
        dedupe: true,
        staleOnError: true,
      });
      return items.map((item) => ({
        ...item,
        locationId: item.location?.id ?? "",
        remarks: null,
        updatedAt: item.createdAt,
      }));
    },
    getInquiry(inquiryId: string): Promise<AssociateInquiry | null> {
      return authRequest<AssociateInquiry | null>(`/api/inquiries/${inquiryId}`);
    },
    createInquiry(payload: AssociateInquiryInput): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>("/api/inquiries", {
        method: "POST",
        body: payload,
      });
    },
    updateInquiry(inquiryId: string, payload: AssociateInquiryUpdateInput): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        body: payload,
      });
    },
    updateStatus(inquiryId: string, status: string): Promise<AssociateInquiry> {
      return authRequest<AssociateInquiry>(`/api/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        body: { status },
      });
    },
    addAction(inquiryId: string, payload: { actionType: string; remarks: string; actionDate: string }) {
      return authRequest(`/api/inquiries/${inquiryId}/actions`, {
        method: "POST",
        body: payload,
      });
    },
    deleteAction(inquiryId: string, actionId: string) {
      return authRequest(`/api/inquiries/${inquiryId}/actions/${actionId}`, {
        method: "DELETE",
      });
    },
  };
}

export async function getLocationOptions(authRequest: AuthenticatedRequest): Promise<LocationOption[]> {
  const rows = await authRequest<unknown[]>("/api/locations");
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const r = row as { id?: string; label?: string | null };
      return { id: r.id ?? "", label: r.label ?? "" };
    })
    .filter((row) => row.id.length > 0);
}
