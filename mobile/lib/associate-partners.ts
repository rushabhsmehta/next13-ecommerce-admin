import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface AssociatePartnerOption {
  id: string;
  name: string;
  email: string | null;
  gmail: string | null;
  mobileNumber: string;
  isActive: boolean;
}

export interface AssociatePartnerListResponse {
  partners: AssociatePartnerOption[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface AssociatePartnerListFilters {
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AssociatePartnerInput {
  name: string;
  mobileNumber: string;
  email?: string | null;
  gmail?: string | null;
  isActive?: boolean;
}

export interface AssociatePartnerDetailInquiry {
  id: string;
  customerName: string;
  status: string;
  journeyDate: string | null;
  createdAt: string;
  location: { id: string; label: string } | null;
}

export interface AssociatePartnerDetail {
  partner: AssociatePartnerOption & {
    createdAt: string;
    updatedAt: string;
  };
  summary: { inquiryCount: number };
  recentInquiries: AssociatePartnerDetailInquiry[];
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

/**
 * Legacy helper used by lookup pickers. Hits the public `/api/associate-partners`
 * endpoint which accepts both Clerk session and mobile bearer auth. Kept for
 * compatibility with existing inquiry-create flows that pre-date the dedicated
 * `/api/mobile/associate-partners` route.
 */
export async function fetchAssociatePartners(
  request: AuthenticatedRequest,
  options?: { activeOnly?: boolean }
): Promise<AssociatePartnerOption[]> {
  const q = options?.activeOnly ? "?activeOnly=true" : "";
  const rows = await request<unknown[]>(`/api/associate-partners${q}`);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const row = r as {
        id?: string;
        name?: string;
        email?: string | null;
        gmail?: string | null;
        mobileNumber?: string;
        isActive?: boolean;
      };
      return {
        id: row.id ?? "",
        name: row.name ?? "",
        email: row.email ?? null,
        gmail: row.gmail ?? null,
        mobileNumber: row.mobileNumber ?? "",
        isActive: row.isActive !== false,
      };
    })
    .filter((r) => r.id.length > 0);
}

/**
 * Full CRUD client for associate partners. Used by the mobile CRM directory
 * screens. Admin-only on the server side.
 */
export function createAssociatePartnersClient(authRequest: AuthenticatedRequest) {
  return {
    list(
      filters: AssociatePartnerListFilters = {}
    ): Promise<AssociatePartnerListResponse> {
      const qs = new URLSearchParams();
      if (filters.activeOnly) qs.set("activeOnly", "true");
      if (filters.search) qs.set("search", filters.search);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<AssociatePartnerListResponse>(
        `/api/mobile/associate-partners${q ? `?${q}` : ""}`
      );
    },

    get(id: string): Promise<AssociatePartnerDetail> {
      return authRequest<AssociatePartnerDetail>(
        `/api/mobile/associate-partners/${encodeURIComponent(id)}`
      );
    },

    create(input: AssociatePartnerInput): Promise<AssociatePartnerOption> {
      return authRequest<AssociatePartnerOption>(
        "/api/mobile/associate-partners",
        {
          method: "POST",
          body: input,
          headers: { "Idempotency-Key": makeIdempotencyKey("partner-create") },
        }
      );
    },

    update(
      id: string,
      input: AssociatePartnerInput
    ): Promise<AssociatePartnerOption> {
      return authRequest<AssociatePartnerOption>(
        `/api/mobile/associate-partners/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
        }
      );
    },

    delete(
      id: string
    ): Promise<{ deleted?: boolean; deactivated?: boolean; partner: AssociatePartnerOption }> {
      return authRequest(
        `/api/mobile/associate-partners/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };
}

export type AssociatePartnersClient = ReturnType<typeof createAssociatePartnersClient>;
