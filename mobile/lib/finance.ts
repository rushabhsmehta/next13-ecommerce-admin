/**
 * Typed client for mobile Finance. Finance is `online_only`: every write sets
 * `requireOnline: true` so the API client hard-blocks offline before any
 * money moves. All money writes send an Idempotency-Key so a flaky network
 * retry can't double-post and drift balances.
 */
type FinanceRequest = <T = any>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    body?: any;
    headers?: Record<string, string>;
    requireOnline?: boolean;
    retries?: number;
  }
) => Promise<T>;

export type AccountKind = "bank" | "cash";

export interface FinanceAccount {
  id: string;
  kind: AccountKind;
  name: string;
  subtitle: string;
  openingBalance: number;
  currentBalance: number;
}

export interface FinanceAccountsResponse {
  accounts: FinanceAccount[];
  totalBalance: number;
}

export interface AccountTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  isInflow: boolean;
  balance?: number;
}

export interface AccountDetailResponse {
  account: FinanceAccount & { kind: AccountKind };
  transactions: AccountTransaction[];
}

export interface TransferInput {
  from: { kind: AccountKind; id: string };
  to: { kind: AccountKind; id: string };
  amount: number;
  transferDate: string;
  description?: string;
  reference?: string;
}

export interface ExpenseInput {
  amount: number;
  expenseDate: string;
  description?: string;
  expenseCategoryId?: string | null;
  accountKind?: AccountKind;
  accountId?: string;
  isAccrued?: boolean;
  accruedDate?: string | null;
  tourPackageQueryId?: string | null;
}

export interface IncomeInput {
  amount: number;
  incomeDate: string;
  description?: string;
  incomeCategoryId?: string | null;
  accountKind: AccountKind;
  accountId: string;
  tourPackageQueryId?: string | null;
}

export interface FinanceParty {
  id: string;
  name: string;
  subtitle: string;
}

export interface AllocatableItem {
  id: string;
  reference: string;
  date: string;
  tourPackageQueryId: string | null;
  tourPackageQueryName: string | null;
  totalAmount: number;
  allocated: number;
  balanceDue: number;
}

export interface ReceiptAllocationInput {
  saleDetailId: string;
  allocatedAmount: number;
  note?: string | null;
}

export interface ReceiptInput {
  receiptType?: string;
  customerId?: string | null;
  supplierId?: string | null;
  receiptDate: string;
  amount: number;
  accountKind: AccountKind;
  accountId: string;
  tourPackageQueryId?: string | null;
  note?: string | null;
  saleAllocations?: ReceiptAllocationInput[];
}

export interface PaymentAllocationInput {
  purchaseDetailId: string;
  allocatedAmount: number;
  note?: string | null;
}

export interface PaymentInput {
  paymentType?: string;
  supplierId?: string | null;
  customerId?: string | null;
  paymentDate: string;
  amount: number;
  accountKind: AccountKind;
  accountId: string;
  tourPackageQueryId?: string | null;
  note?: string | null;
  purchaseAllocations?: PaymentAllocationInput[];
}

export interface SaleItemInput {
  productName: string;
  description?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  taxAmount?: number | null;
}

export interface SaleInput {
  customerId: string;
  tourPackageQueryId?: string | null;
  saleDate: string;
  invoiceNumber?: string | null;
  salePrice: number;
  gstAmount?: number | null;
  gstPercentage?: number | null;
  isGst?: boolean;
  couponCode?: string | null;
  couponRedemptionId?: string | null;
  description?: string | null;
  items?: SaleItemInput[];
}

export interface PurchaseInput {
  supplierId: string;
  tourPackageQueryId?: string | null;
  purchaseDate: string;
  billNumber?: string | null;
  price: number;
  gstAmount?: number | null;
  gstPercentage?: number | null;
  isGst?: boolean;
  description?: string | null;
  items?: SaleItemInput[];
}

export interface SaleReturnInput {
  saleDetailId: string;
  returnDate: string;
  amount: number;
  gstAmount?: number | null;
  reference?: string | null;
  returnReason?: string | null;
  creditType?: string;
  creditNoteAmount?: number | null;
  creditNoteNumber?: string | null;
}

export interface PurchaseReturnInput {
  purchaseDetailId: string;
  returnDate: string;
  amount: number;
  gstAmount?: number | null;
  reference?: string | null;
  returnReason?: string | null;
  supplierCreditType?: string;
  supplierCreditExpiry?: string | null;
}

export interface ChallanInput {
  bsrCode?: string | null;
  challanSerialNo?: string | null;
  depositDate?: string | null;
  paymentMode?: string | null;
  bankName?: string | null;
  amount?: number | null;
  notes?: string | null;
  transactionIds?: string[];
}

function idemKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createFinanceClient(request: FinanceRequest) {
  return {
    listAccounts(): Promise<FinanceAccountsResponse> {
      return request<FinanceAccountsResponse>(
        "/api/mobile/finance/accounts",
        { retries: 1 }
      );
    },

    getAccount(
      id: string,
      kind: AccountKind
    ): Promise<AccountDetailResponse> {
      return request<AccountDetailResponse>(
        `/api/mobile/finance/accounts/${encodeURIComponent(id)}?kind=${kind}`,
        { retries: 1 }
      );
    },

    createTransfer(input: TransferInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/transfers", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("transfer") },
      });
    },

    createExpense(input: ExpenseInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/expenses", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("expense") },
      });
    },

    createIncome(input: IncomeInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/incomes", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("income") },
      });
    },

    listParties(
      type: "customer" | "supplier",
      search?: string
    ): Promise<{ type: string; parties: FinanceParty[] }> {
      const q = new URLSearchParams({ type });
      if (search) q.set("search", search);
      return request(`/api/mobile/finance/parties?${q.toString()}`, {
        retries: 1,
      });
    },

    listAllocatable(
      kind: "sales" | "purchases",
      partyId: string
    ): Promise<{ kind: string; items: AllocatableItem[] }> {
      const q = new URLSearchParams({ kind });
      if (kind === "sales") q.set("customerId", partyId);
      else q.set("supplierId", partyId);
      return request(`/api/mobile/finance/allocatable?${q.toString()}`, {
        retries: 1,
      });
    },

    createReceipt(input: ReceiptInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/receipts", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("receipt") },
      });
    },

    createPayment(input: PaymentInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/payments", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("payment") },
      });
    },

    createSale(input: SaleInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/sales", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("sale") },
      });
    },

    createPurchase(input: PurchaseInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/purchases", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("purchase") },
      });
    },

    createSaleReturn(input: SaleReturnInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/sale-returns", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("salereturn") },
      });
    },

    createPurchaseReturn(
      input: PurchaseReturnInput
    ): Promise<{ id: string }> {
      return request("/api/mobile/finance/purchase-returns", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("purchasereturn") },
      });
    },

    listSaleReturns(creditOnly = false): Promise<{ saleReturns: any[] }> {
      return request(
        `/api/mobile/finance/sale-returns${creditOnly ? "?creditOnly=1" : ""}`,
        { retries: 1 }
      );
    },

    listPurchaseReturns(
      creditOnly = false
    ): Promise<{ purchaseReturns: any[] }> {
      return request(
        `/api/mobile/finance/purchase-returns${
          creditOnly ? "?creditOnly=1" : ""
        }`,
        { retries: 1 }
      );
    },

    listTds(status?: string): Promise<{ transactions: any[]; totals: any }> {
      return request(
        `/api/mobile/finance/tds${
          status ? `?status=${encodeURIComponent(status)}` : ""
        }`,
        { retries: 1 }
      );
    },

    listChallans(): Promise<{ challans: any[] }> {
      return request("/api/mobile/finance/tds/challans", { retries: 1 });
    },

    createChallan(input: ChallanInput): Promise<{ id: string }> {
      return request("/api/mobile/finance/tds/challans", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("challan") },
      });
    },

    /** Authoritative GST/TDS computation (server reuses src/lib/tds.ts). */
    computeTax(input: {
      baseAmount: number;
      gstPercentage?: number;
      interState?: boolean;
      tds?: {
        tdsType: "INCOME_TAX" | "GST";
        tdsMasterId?: string | null;
        overrideRate?: number | null;
        supplierId?: string | null;
        onDate?: string | null;
      };
    }): Promise<{
      baseAmount: number;
      gstPercentage: number;
      gstAmount: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
      tds: {
        tdsType: string;
        base: number;
        rate: number | null;
        tdsAmount: number;
        financialYear: string;
        quarter: string;
      } | null;
    }> {
      return request("/api/mobile/finance/compute-tax", {
        method: "POST",
        body: input,
        requireOnline: true,
      });
    },

    depositTds(input: {
      depositDate: string;
      bsrCode?: string | null;
      challanSerialNo?: string | null;
      paymentMode?: string | null;
      bankName?: string | null;
      transactionIds?: string[];
    }): Promise<{ id: string }> {
      return request("/api/mobile/finance/tds/deposit", {
        method: "POST",
        body: input,
        requireOnline: true,
        headers: { "Idempotency-Key": idemKey("tds-deposit") },
      });
    },

    /** Path for the server-rendered voucher PDF; download via pdf-download. */
    voucherEndpoint(type: "sale" | "purchase", id: string): string {
      return `/api/mobile/finance/vouchers/${type}/${encodeURIComponent(id)}`;
    },
  };
}

export type FinanceClient = ReturnType<typeof createFinanceClient>;
