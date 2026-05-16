/**
 * Typed client for the mobile customer ledger API at
 * /api/mobile/customers/[id]/ledger. Read-only; safe to call from offline
 * caches.
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type LedgerEntryType = "Sale" | "Sale Return" | "Receipt";

export interface LedgerEntry {
  id: string;
  /** ISO date string */
  date: string;
  type: LedgerEntryType;
  description: string;
  debit: number;
  credit: number;
  /** Running balance after this entry */
  balance: number;
  status: string;
  reference: string;
  packageId: string | null;
  packageName: string | null;
}

export interface CustomerLedgerResponse {
  customer: {
    id: string;
    name: string;
    contact: string | null;
    email: string | null;
  };
  transactions: LedgerEntry[];
  summary: {
    totalSales: number;
    totalReturns: number;
    totalReceipts: number;
    currentBalance: number;
  };
}

export function createCustomerLedgerClient(authRequest: AuthenticatedRequest) {
  return {
    get(customerId: string): Promise<CustomerLedgerResponse> {
      return authRequest<CustomerLedgerResponse>(
        `/api/mobile/customers/${encodeURIComponent(customerId)}/ledger`
      );
    },
  };
}

export type CustomerLedgerClient = ReturnType<typeof createCustomerLedgerClient>;
