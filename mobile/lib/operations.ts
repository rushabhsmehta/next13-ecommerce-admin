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
        `/api/mobile/operations/suppliers${q ? `?${q}` : ""}`
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
        `/api/mobile/operations/staff${q ? `?${q}` : ""}`
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

export type OperationsClient = ReturnType<typeof createOperationsClient>;
