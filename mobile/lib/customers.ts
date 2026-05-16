/**
 * Typed client for the mobile customers API at /api/mobile/customers.
 *
 * CRM module is `draft_only` per mobile-admin-access.ts, so we do not flag
 * `requireOnline` here — screens can buffer drafts locally and submit when
 * online is restored.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface CustomerListItem {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  createdAt: string;
  associatePartner: { id: string; name: string } | null;
}

export interface CustomerListResponse {
  customers: CustomerListItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface CustomerListFilters {
  search?: string;
  associatePartnerId?: string;
  limit?: number;
  offset?: number;
}

export interface CustomerDetailInquiry {
  id: string;
  status: string;
  numAdults: number | null;
  numChildren5to11: number | null;
  journeyDate: string | null;
  createdAt: string;
  location: { id: string; label: string } | null;
}

export interface CustomerDetailSale {
  id: string;
  invoiceNumber: string | null;
  salePrice: number;
  gstAmount: number | null;
  status: string | null;
  saleDate: string;
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    contact: string | null;
    email: string | null;
    birthdate: string | null;
    marriageAnniversary: string | null;
    associatePartner: {
      id: string;
      name: string;
      mobileNumber: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  };
  inquiries: CustomerDetailInquiry[];
  sales: CustomerDetailSale[];
  summary: { salesCount: number; outstanding: number };
}

export interface CustomerInput {
  name: string;
  contact?: string | null;
  email?: string | null;
  associatePartnerId?: string | null;
  /** ISO date string YYYY-MM-DD */
  birthdate?: string | null;
  /** ISO date string YYYY-MM-DD */
  marriageAnniversary?: string | null;
}

export interface CustomerRecord {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  birthdate: string | null;
  marriageAnniversary: string | null;
  associatePartner: { id: string; name: string } | null;
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createCustomersClient(authRequest: AuthenticatedRequest) {
  return {
    list(filters: CustomerListFilters = {}): Promise<CustomerListResponse> {
      const qs = new URLSearchParams();
      if (filters.search) qs.set("search", filters.search);
      if (filters.associatePartnerId)
        qs.set("associatePartnerId", filters.associatePartnerId);
      if (filters.limit) qs.set("limit", String(filters.limit));
      if (filters.offset) qs.set("offset", String(filters.offset));
      const q = qs.toString();
      return authRequest<CustomerListResponse>(
        `/api/mobile/customers${q ? `?${q}` : ""}`
      );
    },

    get(id: string): Promise<CustomerDetail> {
      return authRequest<CustomerDetail>(
        `/api/mobile/customers/${encodeURIComponent(id)}`
      );
    },

    create(input: CustomerInput): Promise<CustomerRecord> {
      return authRequest<CustomerRecord>("/api/mobile/customers", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("customer-create") },
      });
    },

    update(id: string, input: CustomerInput): Promise<CustomerRecord> {
      return authRequest<CustomerRecord>(
        `/api/mobile/customers/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: input,
        }
      );
    },
  };
}

export type CustomersClient = ReturnType<typeof createCustomersClient>;
