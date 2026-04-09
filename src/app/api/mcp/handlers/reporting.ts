import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { buildDateFilter } from "../lib/date-filter";
import { dateToUtc } from "@/lib/timezone-utils";

// ── Schemas ──────────────────────────────────────────────────────────────────

const GetProfitLossSchema = z.object({
  startDate: isoDateString,
  endDate: isoDateString,
});

const GetCustomerStatementSchema = z.object({
  customerId: z.string().min(1),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const GetSupplierStatementSchema = z.object({
  supplierId: z.string().min(1),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const GetCashBookSchema = z.object({
  cashAccountId: z.string().min(1),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(500).optional().default(200),
});

const GetBankBookSchema = z.object({
  bankAccountId: z.string().min(1),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(500).optional().default(200),
});

const GetTdsSummarySchema = z.object({
  startDate: isoDateString,
  endDate: isoDateString,
});

const GetGstSummarySchema = z.object({
  startDate: isoDateString,
  endDate: isoDateString,
});

const GetExpenseBreakdownSchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const GetRevenueByLocationSchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const GetDailyCollectionReportSchema = z.object({
  date: isoDateString,
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function getProfitLoss(rawParams: unknown) {
  const { startDate, endDate } = GetProfitLossSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  if (!dateFilter) throw new McpError("Invalid date range", "VALIDATION_ERROR", 422);

  const [sales, purchases, incomes, expenses] = await Promise.all([
    prismadb.saleDetail.findMany({
      where: { saleDate: dateFilter },
      select: { salePrice: true, gstAmount: true },
    }),
    prismadb.purchaseDetail.findMany({
      where: { purchaseDate: dateFilter },
      select: { price: true, gstAmount: true, netPayable: true },
    }),
    prismadb.incomeDetail.findMany({
      where: { incomeDate: dateFilter },
      select: { amount: true },
    }),
    prismadb.expenseDetail.findMany({
      where: { expenseDate: dateFilter, isAccrued: false },
      select: { amount: true },
    }),
  ]);

  const totalSales = sales.reduce((s, r) => s + r.salePrice, 0);
  const totalSalesGst = sales.reduce((s, r) => s + (r.gstAmount ?? 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + r.price, 0);
  const totalPurchasesGst = purchases.reduce((s, r) => s + (r.gstAmount ?? 0), 0);
  const totalIncomes = incomes.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  const grossRevenue = totalSales + totalIncomes;
  const grossCost = totalPurchases + totalExpenses;
  const grossProfit = grossRevenue - grossCost;
  const netGst = totalSalesGst - totalPurchasesGst;

  return {
    period: { startDate, endDate },
    revenue: { sales: totalSales, salesGst: totalSalesGst, otherIncome: totalIncomes, total: grossRevenue },
    costs: { purchases: totalPurchases, purchasesGst: totalPurchasesGst, expenses: totalExpenses, total: grossCost },
    grossProfit,
    netGst,
    netProfit: grossProfit - netGst,
  };
}

async function getCustomerStatement(rawParams: unknown) {
  const { customerId, startDate, endDate } = GetCustomerStatementSchema.parse(rawParams);
  const customer = await prismadb.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, contact: true } });
  if (!customer) throw new NotFoundError(`Customer ${customerId} not found`);

  const saleDateFilter = buildDateFilter(startDate, endDate);
  const saleReturnDateFilter = buildDateFilter(startDate, endDate);
  const receiptDateFilter = buildDateFilter(startDate, endDate);

  const [sales, saleReturns, receipts] = await Promise.all([
    prismadb.saleDetail.findMany({
      where: {
        customerId,
        ...(saleDateFilter && { saleDate: saleDateFilter }),
      },
      select: {
        id: true, saleDate: true, salePrice: true, gstAmount: true, invoiceNumber: true, description: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
        receiptAllocations: { select: { allocatedAmount: true } },
      },
      orderBy: { saleDate: "asc" },
    }),
    prismadb.saleReturn.findMany({
      where: {
        ...(saleReturnDateFilter && { returnDate: saleReturnDateFilter }),
        OR: [
          { customerId },
          { saleDetail: { customerId } },
        ],
      },
      select: {
        id: true,
        returnDate: true,
        amount: true,
        gstAmount: true,
        creditNoteAmount: true,
        reference: true,
        status: true,
        saleDetailId: true,
        saleDetail: {
          select: {
            id: true,
            saleDate: true,
            invoiceNumber: true,
            description: true,
            tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
          },
        },
      },
      orderBy: { returnDate: "asc" },
    }),
    prismadb.receiptDetail.findMany({
      where: {
        customerId,
        ...(receiptDateFilter && { receiptDate: receiptDateFilter }),
      },
      select: {
        id: true, receiptDate: true, amount: true, reference: true, note: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
      },
      orderBy: { receiptDate: "asc" },
    }),
  ]);

  const totalInvoiced = sales.reduce((s, r) => s + r.salePrice + (r.gstAmount ?? 0), 0);
  const totalReturned = saleReturns.reduce((s, r) => s + r.amount + (r.gstAmount ?? 0), 0);
  const totalReceived = receipts.reduce((s, r) => s + r.amount, 0);

  return {
    customer,
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    totalInvoiced,
    totalReturned,
    totalReceived,
    balance: totalInvoiced - totalReturned - totalReceived,
    sales: sales.map((s) => ({
      ...s,
      total: s.salePrice + (s.gstAmount ?? 0),
      allocated: s.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0),
    })),
    saleReturns: saleReturns.map((saleReturn) => ({
      ...saleReturn,
      total: saleReturn.amount + (saleReturn.gstAmount ?? 0),
    })),
    receipts,
  };
}

async function getSupplierStatement(rawParams: unknown) {
  const { supplierId, startDate, endDate } = GetSupplierStatementSchema.parse(rawParams);
  const supplier = await prismadb.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true, contact: true } });
  if (!supplier) throw new NotFoundError(`Supplier ${supplierId} not found`);

  const purchaseDateFilter = buildDateFilter(startDate, endDate);
  const purchaseReturnDateFilter = buildDateFilter(startDate, endDate);
  const paymentDateFilter = buildDateFilter(startDate, endDate);

  const [purchases, purchaseReturns, payments] = await Promise.all([
    prismadb.purchaseDetail.findMany({
      where: {
        supplierId,
        ...(purchaseDateFilter && { purchaseDate: purchaseDateFilter }),
      },
      select: {
        id: true, purchaseDate: true, price: true, gstAmount: true, netPayable: true, billNumber: true, description: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
        paymentAllocations: { select: { allocatedAmount: true } },
      },
      orderBy: { purchaseDate: "asc" },
    }),
    prismadb.purchaseReturn.findMany({
      where: {
        ...(purchaseReturnDateFilter && { returnDate: purchaseReturnDateFilter }),
        OR: [
          { supplierId },
          { purchaseDetail: { supplierId } },
        ],
      },
      select: {
        id: true,
        returnDate: true,
        amount: true,
        gstAmount: true,
        reference: true,
        status: true,
        purchaseDetailId: true,
        purchaseDetail: {
          select: {
            id: true,
            purchaseDate: true,
            billNumber: true,
            description: true,
            tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
          },
        },
      },
      orderBy: { returnDate: "asc" },
    }),
    prismadb.paymentDetail.findMany({
      where: {
        supplierId,
        ...(paymentDateFilter && { paymentDate: paymentDateFilter }),
      },
      select: {
        id: true, paymentDate: true, amount: true, method: true, note: true,
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
      },
      orderBy: { paymentDate: "asc" },
    }),
  ]);

  const totalBilled = purchases.reduce((s, r) => s + (r.netPayable ?? (r.price + (r.gstAmount ?? 0))), 0);
  const totalReturned = purchaseReturns.reduce((s, r) => s + r.amount + (r.gstAmount ?? 0), 0);
  const totalPaid = payments.reduce((s, r) => s + r.amount, 0);

  return {
    supplier,
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    totalBilled,
    totalReturned,
    totalPaid,
    balance: totalBilled - totalReturned - totalPaid,
    purchases: purchases.map((p) => ({
      ...p,
      total: p.netPayable ?? (p.price + (p.gstAmount ?? 0)),
      allocated: p.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0),
    })),
    purchaseReturns: purchaseReturns.map((purchaseReturn) => ({
      ...purchaseReturn,
      total: purchaseReturn.amount + (purchaseReturn.gstAmount ?? 0),
    })),
    payments,
  };
}

async function getCashBook(rawParams: unknown) {
  const { cashAccountId, startDate, endDate, limit } = GetCashBookSchema.parse(rawParams);
  const acct = await prismadb.cashAccount.findUnique({
    where: { id: cashAccountId },
    select: { id: true, accountName: true, currentBalance: true },
  });
  if (!acct) throw new NotFoundError(`Cash account ${cashAccountId} not found`);

  const dateFilter = buildDateFilter(startDate, endDate);
  const acctFilter = { cashAccountId };

  const [receipts, payments, incomes, expenses, transfersIn, transfersOut] = await Promise.all([
    prismadb.receiptDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { receiptDate: dateFilter }) },
      select: { id: true, receiptDate: true, amount: true, reference: true, note: true, customer: { select: { name: true } } },
      orderBy: { receiptDate: "desc" }, take: limit,
    }),
    prismadb.paymentDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { paymentDate: dateFilter }) },
      select: { id: true, paymentDate: true, amount: true, method: true, note: true, supplier: { select: { name: true } } },
      orderBy: { paymentDate: "desc" }, take: limit,
    }),
    prismadb.incomeDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { incomeDate: dateFilter }) },
      select: { id: true, incomeDate: true, amount: true, description: true },
      orderBy: { incomeDate: "desc" }, take: limit,
    }),
    prismadb.expenseDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { expenseDate: dateFilter }) },
      select: { id: true, expenseDate: true, amount: true, description: true },
      orderBy: { expenseDate: "desc" }, take: limit,
    }),
    prismadb.transfer.findMany({
      where: { toCashAccountId: cashAccountId, ...(dateFilter && { transferDate: dateFilter }) },
      select: { id: true, transferDate: true, amount: true, description: true, fromBankAccount: { select: { accountName: true } }, fromCashAccount: { select: { accountName: true } } },
      orderBy: { transferDate: "desc" }, take: limit,
    }),
    prismadb.transfer.findMany({
      where: { fromCashAccountId: cashAccountId, ...(dateFilter && { transferDate: dateFilter }) },
      select: { id: true, transferDate: true, amount: true, description: true, toBankAccount: { select: { accountName: true } }, toCashAccount: { select: { accountName: true } } },
      orderBy: { transferDate: "desc" }, take: limit,
    }),
  ]);

  const totalInflow = receipts.reduce((s, r) => s + r.amount, 0) + incomes.reduce((s, r) => s + r.amount, 0) + transfersIn.reduce((s, r) => s + r.amount, 0);
  const totalOutflow = payments.reduce((s, r) => s + r.amount, 0) + expenses.reduce((s, r) => s + r.amount, 0) + transfersOut.reduce((s, r) => s + r.amount, 0);

  return {
    account: acct,
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    totalInflow, totalOutflow, netFlow: totalInflow - totalOutflow,
    receipts, payments, incomes, expenses, transfersIn, transfersOut,
  };
}

async function getBankBook(rawParams: unknown) {
  const { bankAccountId, startDate, endDate, limit } = GetBankBookSchema.parse(rawParams);
  const acct = await prismadb.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { id: true, accountName: true, bankName: true, currentBalance: true },
  });
  if (!acct) throw new NotFoundError(`Bank account ${bankAccountId} not found`);

  const dateFilter = buildDateFilter(startDate, endDate);
  const acctFilter = { bankAccountId };

  const [receipts, payments, incomes, expenses, transfersIn, transfersOut] = await Promise.all([
    prismadb.receiptDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { receiptDate: dateFilter }) },
      select: { id: true, receiptDate: true, amount: true, reference: true, note: true, customer: { select: { name: true } } },
      orderBy: { receiptDate: "desc" }, take: limit,
    }),
    prismadb.paymentDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { paymentDate: dateFilter }) },
      select: { id: true, paymentDate: true, amount: true, method: true, note: true, supplier: { select: { name: true } } },
      orderBy: { paymentDate: "desc" }, take: limit,
    }),
    prismadb.incomeDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { incomeDate: dateFilter }) },
      select: { id: true, incomeDate: true, amount: true, description: true },
      orderBy: { incomeDate: "desc" }, take: limit,
    }),
    prismadb.expenseDetail.findMany({
      where: { ...acctFilter, ...(dateFilter && { expenseDate: dateFilter }) },
      select: { id: true, expenseDate: true, amount: true, description: true },
      orderBy: { expenseDate: "desc" }, take: limit,
    }),
    prismadb.transfer.findMany({
      where: { toBankAccountId: bankAccountId, ...(dateFilter && { transferDate: dateFilter }) },
      select: { id: true, transferDate: true, amount: true, description: true, fromBankAccount: { select: { accountName: true } }, fromCashAccount: { select: { accountName: true } } },
      orderBy: { transferDate: "desc" }, take: limit,
    }),
    prismadb.transfer.findMany({
      where: { fromBankAccountId: bankAccountId, ...(dateFilter && { transferDate: dateFilter }) },
      select: { id: true, transferDate: true, amount: true, description: true, toBankAccount: { select: { accountName: true } }, toCashAccount: { select: { accountName: true } } },
      orderBy: { transferDate: "desc" }, take: limit,
    }),
  ]);

  const totalInflow = receipts.reduce((s, r) => s + r.amount, 0) + incomes.reduce((s, r) => s + r.amount, 0) + transfersIn.reduce((s, r) => s + r.amount, 0);
  const totalOutflow = payments.reduce((s, r) => s + r.amount, 0) + expenses.reduce((s, r) => s + r.amount, 0) + transfersOut.reduce((s, r) => s + r.amount, 0);

  return {
    account: acct,
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    totalInflow, totalOutflow, netFlow: totalInflow - totalOutflow,
    receipts, payments, incomes, expenses, transfersIn, transfersOut,
  };
}

async function getTdsSummary(rawParams: unknown) {
  const { startDate, endDate } = GetTdsSummarySchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  if (!dateFilter) throw new McpError("Invalid date range", "VALIDATION_ERROR", 422);

  const purchases = await prismadb.purchaseDetail.findMany({
    where: {
      purchaseDate: dateFilter,
      tdsAmount: { gt: 0 },
    },
    select: {
      id: true, purchaseDate: true, price: true, tdsAmount: true, billNumber: true,
      supplier: { select: { id: true, name: true, panNumber: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
    },
    orderBy: { purchaseDate: "asc" },
  });

  const totalTds = purchases.reduce((s, p) => s + (p.tdsAmount ?? 0), 0);
  const totalPurchaseValue = purchases.reduce((s, p) => s + p.price, 0);

  return {
    period: { startDate, endDate },
    totalPurchaseValue,
    totalTdsDeducted: totalTds,
    transactionCount: purchases.length,
    transactions: purchases,
  };
}

async function getGstSummary(rawParams: unknown) {
  const { startDate, endDate } = GetGstSummarySchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  if (!dateFilter) throw new McpError("Invalid date range", "VALIDATION_ERROR", 422);

  const [sales, purchases] = await Promise.all([
    prismadb.saleDetail.findMany({
      where: { saleDate: dateFilter, isGst: true },
      select: { salePrice: true, gstAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true },
    }),
    prismadb.purchaseDetail.findMany({
      where: { purchaseDate: dateFilter, isGst: true },
      select: { price: true, gstAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true },
    }),
  ]);

  const outputGst = sales.reduce((s, r) => s + (r.gstAmount ?? 0), 0);
  const outputCgst = sales.reduce((s, r) => s + (r.cgstAmount ?? 0), 0);
  const outputSgst = sales.reduce((s, r) => s + (r.sgstAmount ?? 0), 0);
  const outputIgst = sales.reduce((s, r) => s + (r.igstAmount ?? 0), 0);

  const inputGst = purchases.reduce((s, r) => s + (r.gstAmount ?? 0), 0);
  const inputCgst = purchases.reduce((s, r) => s + (r.cgstAmount ?? 0), 0);
  const inputSgst = purchases.reduce((s, r) => s + (r.sgstAmount ?? 0), 0);
  const inputIgst = purchases.reduce((s, r) => s + (r.igstAmount ?? 0), 0);

  return {
    period: { startDate, endDate },
    output: { total: outputGst, cgst: outputCgst, sgst: outputSgst, igst: outputIgst, saleCount: sales.length },
    input: { total: inputGst, cgst: inputCgst, sgst: inputSgst, igst: inputIgst, purchaseCount: purchases.length },
    netPayable: {
      total: outputGst - inputGst,
      cgst: outputCgst - inputCgst,
      sgst: outputSgst - inputSgst,
      igst: outputIgst - inputIgst,
    },
  };
}

async function getExpenseBreakdown(rawParams: unknown) {
  const { startDate, endDate } = GetExpenseBreakdownSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);

  const expenses = await prismadb.expenseDetail.findMany({
    where: {
      isAccrued: false,
      ...(dateFilter && { expenseDate: dateFilter }),
    },
    select: {
      amount: true,
      expenseCategory: { select: { id: true, name: true } },
    },
  });

  // Group by category
  const categoryMap = new Map<string, { id: string | null; name: string; total: number; count: number }>();
  for (const e of expenses) {
    const key = e.expenseCategory?.id ?? "uncategorized";
    const name = e.expenseCategory?.name ?? "Uncategorized";
    const existing = categoryMap.get(key);
    if (existing) {
      existing.total += e.amount;
      existing.count += 1;
    } else {
      categoryMap.set(key, { id: e.expenseCategory?.id ?? null, name, total: e.amount, count: 1 });
    }
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  const grandTotal = categories.reduce((s, c) => s + c.total, 0);

  return {
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    grandTotal,
    categories: categories.map((c) => ({
      ...c,
      percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 10000) / 100 : 0,
    })),
  };
}

async function getRevenueByLocation(rawParams: unknown) {
  const { startDate, endDate } = GetRevenueByLocationSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);

  const sales = await prismadb.saleDetail.findMany({
    where: { ...(dateFilter && { saleDate: dateFilter }) },
    select: {
      salePrice: true,
      gstAmount: true,
      tourPackageQuery: {
        select: {
          location: { select: { id: true, label: true } },
        },
      },
    },
  });

  // Group by location
  const locationMap = new Map<string, { id: string; label: string; total: number; count: number }>();
  for (const s of sales) {
    const loc = s.tourPackageQuery?.location;
    const key = loc?.id ?? "unknown";
    const label = loc?.label ?? "Unknown";
    const amount = s.salePrice + (s.gstAmount ?? 0);
    const existing = locationMap.get(key);
    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      locationMap.set(key, { id: key, label, total: amount, count: 1 });
    }
  }

  const locations = Array.from(locationMap.values()).sort((a, b) => b.total - a.total);
  const grandTotal = locations.reduce((s, l) => s + l.total, 0);

  return {
    period: { startDate: startDate ?? "all", endDate: endDate ?? "all" },
    grandTotal,
    locations: locations.map((l) => ({
      ...l,
      percentage: grandTotal > 0 ? Math.round((l.total / grandTotal) * 10000) / 100 : 0,
    })),
  };
}

async function getDailyCollectionReport(rawParams: unknown) {
  const { date } = GetDailyCollectionReportSchema.parse(rawParams);
  const dateFilter = buildDateFilter(date, date);
  if (!dateFilter) throw new McpError("Invalid date", "VALIDATION_ERROR", 422);

  const [receipts, payments] = await Promise.all([
    prismadb.receiptDetail.findMany({
      where: { receiptDate: dateFilter },
      select: {
        id: true, amount: true, reference: true, receiptType: true,
        customer: { select: { id: true, name: true } },
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
    prismadb.paymentDetail.findMany({
      where: { paymentDate: dateFilter },
      select: {
        id: true, amount: true, method: true, paymentType: true,
        supplier: { select: { id: true, name: true } },
        tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
  ]);

  const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);
  const totalDisbursed = payments.reduce((s, p) => s + p.amount, 0);

  return {
    date,
    totalCollected,
    totalDisbursed,
    netCollection: totalCollected - totalDisbursed,
    receipts,
    payments,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const reportingHandlers: ToolHandlerMap = {
  get_profit_loss: getProfitLoss,
  get_customer_statement: getCustomerStatement,
  get_supplier_statement: getSupplierStatement,
  get_cash_book: getCashBook,
  get_bank_book: getBankBook,
  get_tds_summary: getTdsSummary,
  get_gst_summary: getGstSummary,
  get_expense_breakdown: getExpenseBreakdown,
  get_revenue_by_location: getRevenueByLocation,
  get_daily_collection_report: getDailyCollectionReport,
};
