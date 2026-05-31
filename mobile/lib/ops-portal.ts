import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface OpsPortalAction {
  id: string;
  actionType: string;
  remarks: string;
  actionDate: string;
  createdAt?: string;
}

export interface OpsPortalTourQuery {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  customerName: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  isFeatured: boolean;
  isArchived: boolean;
  totalPrice: string | number | null;
}

export interface OpsPortalInquiry {
  id: string;
  customerName: string;
  customerMobileNumber: string;
  status: string;
  journeyDate: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  remarks: string | null;
  numAdults: number;
  numChildrenAbove11: number;
  numChildren5to11: number;
  numChildrenBelow5: number;
  location: { id: string; label: string } | null;
  associatePartner: { id: string; name: string } | null;
  actions: OpsPortalAction[];
  tourPackageQueries: OpsPortalTourQuery[];
}

export interface OpsPortalListResponse {
  staff: { id: string; name: string; email: string };
  items: OpsPortalInquiry[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function query(filters: Record<string, string | number | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && String(v).trim() !== "") qs.set(k, String(v));
  }
  const raw = qs.toString();
  return raw ? `?${raw}` : "";
}

const READ_CACHE = {
  cacheTtlSeconds: 30,
  dedupe: true,
  staleOnError: true,
  retries: 1,
} as const;

export function createOpsPortalClient(authRequest: AuthenticatedRequest) {
  return {
    list(
      filters: { search?: string; status?: string; limit?: number; offset?: number } = {}
    ): Promise<OpsPortalListResponse> {
      return authRequest(
        `/api/mobile/ops-portal/my-inquiries${query(filters)}`,
        READ_CACHE
      );
    },

    get(inquiryId: string): Promise<OpsPortalInquiry> {
      return authRequest(
        `/api/mobile/ops-portal/my-inquiries/${encodeURIComponent(inquiryId)}`,
        { retries: 1 }
      );
    },

    update(
      inquiryId: string,
      input: { status?: string; nextFollowUpDate?: string | null; remarks?: string | null }
    ): Promise<OpsPortalInquiry> {
      return authRequest(
        `/api/mobile/ops-portal/my-inquiries/${encodeURIComponent(inquiryId)}`,
        {
          method: "PATCH",
          body: input,
          headers: { "Idempotency-Key": makeIdempotencyKey("ops-inquiry-update") },
        }
      );
    },

    addAction(
      inquiryId: string,
      input: { actionType: string; remarks: string; actionDate?: string }
    ): Promise<OpsPortalAction> {
      return authRequest(
        `/api/mobile/ops-portal/my-inquiries/${encodeURIComponent(inquiryId)}/actions`,
        {
          method: "POST",
          body: input,
          headers: { "Idempotency-Key": makeIdempotencyKey("ops-inquiry-action") },
        }
      );
    },
  };
}

export type OpsPortalClient = ReturnType<typeof createOpsPortalClient>;
