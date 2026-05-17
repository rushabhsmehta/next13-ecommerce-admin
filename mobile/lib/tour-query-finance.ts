/**
 * Typed client for tour-query per-query financial summary (read-only).
 */
import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface TourQueryFinanceSectionRow {
  id: string;
  reference: string | null;
  date: string;
  amount: number;
  status: string | null;
  counterpartyName: string | null;
}

export interface TourQueryFinanceResponse {
  query: {
    id: string;
    tourPackageQueryNumber: string | null;
    tourPackageQueryName: string | null;
    customerName: string | null;
  };
  totals: {
    sales: number;
    purchases: number;
    receipts: number;
    payments: number;
    expenses: number;
    incomes: number;
    saleReturns: number;
    purchaseReturns: number;
    grossProfit: number;
    netProfit: number;
    customerOutstanding: number;
    supplierOutstanding: number;
  };
  sections: {
    sales: TourQueryFinanceSectionRow[];
    purchases: TourQueryFinanceSectionRow[];
    receipts: TourQueryFinanceSectionRow[];
    payments: TourQueryFinanceSectionRow[];
    expenses: TourQueryFinanceSectionRow[];
    incomes: TourQueryFinanceSectionRow[];
    saleReturns: TourQueryFinanceSectionRow[];
    purchaseReturns: TourQueryFinanceSectionRow[];
  };
}

export function createTourQueryFinanceClient(authRequest: AuthenticatedRequest) {
  return {
    get(tourQueryId: string): Promise<TourQueryFinanceResponse> {
      return authRequest<TourQueryFinanceResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(tourQueryId)}/finance`,
        { retries: 1 }
      );
    },
  };
}

export type TourQueryFinanceClient = ReturnType<
  typeof createTourQueryFinanceClient
>;
