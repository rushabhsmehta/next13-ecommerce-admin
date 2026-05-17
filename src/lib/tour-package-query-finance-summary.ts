import prismadb from "@/lib/prismadb";

/** Mirrors `/fetchaccounts/[tourPackageQueryId]` Prisma shape (read-only). */
const tourPackageQueryFinanceInclude = {
  purchaseDetails: {
    select: {
      id: true,
      purchaseDate: true,
      price: true,
      gstAmount: true,
      gstPercentage: true,
      description: true,
      supplierId: true,
      billNumber: true,
      referenceNumber: true,
      netPayable: true,
      status: true,
      supplier: { select: { id: true, name: true } },
      purchaseReturns: {
        select: {
          id: true,
          returnDate: true,
          amount: true,
          gstAmount: true,
          returnReason: true,
          status: true,
          reference: true,
          supplier: { select: { name: true } },
        },
      },
      paymentAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { purchaseDate: "asc" as const },
  },
  saleDetails: {
    select: {
      id: true,
      saleDate: true,
      salePrice: true,
      gstAmount: true,
      gstPercentage: true,
      description: true,
      customerId: true,
      invoiceNumber: true,
      status: true,
      customer: { select: { id: true, name: true } },
      saleReturns: {
        select: {
          id: true,
          returnDate: true,
          amount: true,
          gstAmount: true,
          returnReason: true,
          status: true,
          reference: true,
          creditNoteNumber: true,
          saleDetailId: true,
          customer: { select: { name: true } },
        },
      },
      receiptAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { saleDate: "asc" as const },
  },
  paymentDetails: {
    select: {
      id: true,
      paymentDate: true,
      amount: true,
      method: true,
      transactionId: true,
      note: true,
      supplierId: true,
      customerId: true,
      paymentType: true,
      supplier: { select: { id: true, name: true, contact: true } },
      customer: { select: { id: true, name: true, contact: true } },
    },
    orderBy: { paymentDate: "asc" as const },
  },
  receiptDetails: {
    select: {
      id: true,
      receiptDate: true,
      amount: true,
      reference: true,
      note: true,
      customerId: true,
      supplierId: true,
      receiptType: true,
      customer: { select: { id: true, name: true, contact: true } },
      supplier: { select: { id: true, name: true, contact: true } },
    },
    orderBy: { receiptDate: "asc" as const },
  },
  expenseDetails: {
    select: {
      id: true,
      expenseDate: true,
      amount: true,
      description: true,
      isAccrued: true,
      paidDate: true,
      expenseCategory: { select: { name: true } },
    },
    orderBy: { expenseDate: "asc" as const },
  },
  incomeDetails: {
    select: {
      id: true,
      incomeDate: true,
      amount: true,
      description: true,
      incomeCategory: { select: { name: true } },
    },
    orderBy: { incomeDate: "asc" as const },
  },
} as const;

export type TourQueryFinanceSectionRow = {
  id: string;
  reference: string | null;
  date: string;
  amount: number;
  status: string | null;
  counterpartyName: string | null;
};

export type TourQueryFinanceResponse = {
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
};

function roundMoney(value: number): number {
  return Math.round(Number(value) * 100) / 100;
}

function toIsoDate(d: Date): string {
  return d.toISOString();
}

/**
 * Per-query financial summary for mobile (and other consumers).
 * Totals match `fetchaccounts.tsx`; outstanding matches
 * `GET /api/tourPackageQuery/[id]/financial-summary`.
 */
export async function getTourPackageQueryFinanceSummary(
  tourPackageQueryId: string
): Promise<TourQueryFinanceResponse | null> {
  const tpq = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      ...tourPackageQueryFinanceInclude,
    },
  });

  if (!tpq) return null;

  const saleDetails = tpq.saleDetails ?? [];
  const purchaseDetails = tpq.purchaseDetails ?? [];
  const receiptDetails = tpq.receiptDetails ?? [];
  const paymentDetails = tpq.paymentDetails ?? [];
  const expenseDetails = tpq.expenseDetails ?? [];
  const incomeDetails = tpq.incomeDetails ?? [];

  const totalSales = saleDetails.reduce((sum, s) => sum + (s.salePrice || 0), 0);
  const totalPurchases = purchaseDetails.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalExpenses = expenseDetails.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncomes = incomeDetails.reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalSaleReturns = saleDetails.reduce(
    (sum, s) =>
      sum + (s.saleReturns?.reduce((r, sr) => r + (sr.amount || 0), 0) || 0),
    0
  );
  const totalPurchaseReturns = purchaseDetails.reduce(
    (sum, p) =>
      sum + (p.purchaseReturns?.reduce((r, pr) => r + (pr.amount || 0), 0) || 0),
    0
  );

  const totalSalesGST = saleDetails.reduce((sum, s) => sum + (s.gstAmount || 0), 0);
  const totalPurchasesGST = purchaseDetails.reduce(
    (sum, p) => sum + (p.gstAmount || 0),
    0
  );

  const totalSalesWithGST = totalSales + totalSalesGST;
  const totalPurchasesWithGST = totalPurchases + totalPurchasesGST;
  const netSalesWithGST = totalSalesWithGST - totalSaleReturns;
  const netPurchasesWithGST = totalPurchasesWithGST - totalPurchaseReturns;
  const netProfit =
    netSalesWithGST + totalIncomes - (netPurchasesWithGST + totalExpenses);

  const totalReceipts = receiptDetails.reduce((sum, r) => sum + r.amount, 0);
  const totalPayments = paymentDetails.reduce((sum, p) => sum + p.amount, 0);

  const totalSalesInvoiced = saleDetails.reduce(
    (sum, s) => sum + (s.salePrice || 0) + (s.gstAmount || 0),
    0
  );
  const totalSalesReceived = saleDetails.reduce(
    (sum, s) =>
      sum +
      s.receiptAllocations.reduce((a, r) => a + r.allocatedAmount, 0),
    0
  );
  const totalSalesReturnsForOutstanding = saleDetails.reduce(
    (sum, s) =>
      sum + s.saleReturns.reduce((a, r) => a + (r.amount || 0), 0),
    0
  );
  const customerOutstanding =
    totalSalesInvoiced - totalSalesReceived - totalSalesReturnsForOutstanding;

  const totalPurchasesBilled = purchaseDetails.reduce(
    (sum, p) => sum + (p.netPayable ?? (p.price || 0) + (p.gstAmount || 0)),
    0
  );
  const totalPurchasesPaid = purchaseDetails.reduce(
    (sum, p) =>
      sum +
      p.paymentAllocations.reduce((a, pa) => a + pa.allocatedAmount, 0),
    0
  );
  const totalPurchasesReturnsForOutstanding = purchaseDetails.reduce(
    (sum, p) =>
      sum + p.purchaseReturns.reduce((a, r) => a + (r.amount || 0), 0),
    0
  );
  const supplierOutstanding =
    totalPurchasesBilled - totalPurchasesPaid - totalPurchasesReturnsForOutstanding;

  const grossProfit = totalSalesInvoiced - totalPurchasesBilled;

  const saleReturnsFlat = saleDetails.flatMap((s) => s.saleReturns ?? []);

  const sections: TourQueryFinanceResponse["sections"] = {
    sales: saleDetails.map((s) => ({
      id: s.id,
      reference: s.invoiceNumber ?? null,
      date: toIsoDate(s.saleDate),
      amount: roundMoney((s.salePrice || 0) + (s.gstAmount || 0)),
      status: s.status ?? null,
      counterpartyName: s.customer?.name ?? null,
    })),
    purchases: purchaseDetails.map((p) => ({
      id: p.id,
      reference: p.billNumber ?? p.referenceNumber ?? null,
      date: toIsoDate(p.purchaseDate),
      amount: roundMoney((p.price || 0) + (p.gstAmount || 0)),
      status: p.status ?? null,
      counterpartyName: p.supplier?.name ?? null,
    })),
    receipts: receiptDetails.map((r) => ({
      id: r.id,
      reference: r.reference ?? null,
      date: toIsoDate(r.receiptDate),
      amount: roundMoney(r.amount),
      status: r.receiptType ?? null,
      counterpartyName:
        r.receiptType === "supplier_refund"
          ? r.supplier?.name ?? null
          : r.customer?.name ?? null,
    })),
    payments: paymentDetails.map((p) => ({
      id: p.id,
      reference: p.transactionId ?? null,
      date: toIsoDate(p.paymentDate),
      amount: roundMoney(p.amount),
      status: p.paymentType ?? null,
      counterpartyName:
        p.paymentType === "customer_refund"
          ? p.customer?.name ?? null
          : p.supplier?.name ?? null,
    })),
    expenses: expenseDetails.map((e) => ({
      id: e.id,
      reference: null,
      date: toIsoDate(e.expenseDate),
      amount: roundMoney(e.amount),
      status: e.isAccrued ? (e.paidDate ? "paid" : "accrued") : null,
      counterpartyName: e.expenseCategory?.name ?? null,
    })),
    incomes: incomeDetails.map((i) => ({
      id: i.id,
      reference: null,
      date: toIsoDate(i.incomeDate),
      amount: roundMoney(i.amount),
      status: null,
      counterpartyName: i.incomeCategory?.name ?? null,
    })),
    saleReturns: saleReturnsFlat.map((sr) => ({
      id: sr.id,
      reference: sr.creditNoteNumber ?? sr.reference ?? null,
      date: toIsoDate(sr.returnDate),
      amount: roundMoney(sr.amount + (sr.gstAmount || 0)),
      status: sr.status ?? null,
      counterpartyName: sr.customer?.name ?? null,
    })),
    purchaseReturns: purchaseDetails.flatMap((p) =>
      (p.purchaseReturns ?? []).map((pr) => ({
        id: pr.id,
        reference: pr.reference ?? null,
        date: toIsoDate(pr.returnDate),
        amount: roundMoney(pr.amount + (pr.gstAmount || 0)),
        status: pr.status ?? null,
        counterpartyName: pr.supplier?.name ?? p.supplier?.name ?? null,
      }))
    ),
  };

  return {
    query: {
      id: tpq.id,
      tourPackageQueryNumber: tpq.tourPackageQueryNumber,
      tourPackageQueryName: tpq.tourPackageQueryName,
      customerName: tpq.customerName,
    },
    totals: {
      sales: roundMoney(totalSalesWithGST),
      purchases: roundMoney(totalPurchasesWithGST),
      receipts: roundMoney(totalReceipts),
      payments: roundMoney(totalPayments),
      expenses: roundMoney(totalExpenses),
      incomes: roundMoney(totalIncomes),
      saleReturns: roundMoney(totalSaleReturns),
      purchaseReturns: roundMoney(totalPurchaseReturns),
      grossProfit: roundMoney(grossProfit),
      netProfit: roundMoney(netProfit),
      customerOutstanding: roundMoney(customerOutstanding),
      supplierOutstanding: roundMoney(supplierOutstanding),
    },
    sections,
  };
}
