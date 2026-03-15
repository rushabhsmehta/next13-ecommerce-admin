import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { resolveAccount } from "../lib/resolve-account";
import { buildDateFilter } from "../lib/date-filter";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListAccountsSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const GetAccountTransactionsSchema = z.object({
  accountId: z.string().min(1),
  accountType: z.enum(["bank", "cash"]),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

const GetFinancialSummarySchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
});

const CreatePaymentSchema = z.object({
  paymentDate: isoDateString,
  amount: z.number().positive(),
  tourPackageQueryId: z.string().min(1, "tourPackageQueryId is required — use list_tour_queries to find the confirmed tour query ID"),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  method: z.string().optional(),
  transactionId: z.string().optional(),
  remarks: z.string().optional(),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  paymentType: z.enum(["supplier_payment", "customer_refund"]).optional().default("supplier_payment"),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateReceiptSchema = z.object({
  receiptDate: isoDateString,
  amount: z.number().positive(),
  tourPackageQueryId: z.string().min(1, "tourPackageQueryId is required — use list_tour_queries to find the confirmed tour query ID"),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  reference: z.string().optional(),
  remarks: z.string().optional(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  receiptType: z.string().optional().default("customer_receipt"),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const CreateTransferSchema = z.object({
  transferDate: isoDateString,
  amount: z.number().positive(),
  fromBankAccountId: z.string().optional(),
  fromBankAccountName: z.string().optional(),
  fromCashAccountId: z.string().optional(),
  fromCashAccountName: z.string().optional(),
  toBankAccountId: z.string().optional(),
  toBankAccountName: z.string().optional(),
  toCashAccountId: z.string().optional(),
  toCashAccountName: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (d) => !!(d.fromBankAccountId || d.fromBankAccountName || d.fromCashAccountId || d.fromCashAccountName),
  { message: "Provide a source account (fromBankAccountId/Name or fromCashAccountId/Name)", path: ["fromBankAccountId"] }
).refine(
  (d) => !!(d.toBankAccountId || d.toBankAccountName || d.toCashAccountId || d.toCashAccountName),
  { message: "Provide a destination account (toBankAccountId/Name or toCashAccountId/Name)", path: ["toBankAccountId"] }
);

const AllocateReceiptToSaleSchema = z.object({
  receiptDetailId: z.string().min(1),
  saleDetailId: z.string().min(1),
  allocatedAmount: z.number().positive(),
  note: z.string().optional(),
});

const AllocatePaymentToPurchaseSchema = z.object({
  paymentDetailId: z.string().min(1),
  purchaseDetailId: z.string().min(1),
  allocatedAmount: z.number().positive(),
  note: z.string().optional(),
});

const GetOutstandingReceivablesSchema = z.object({
  customerId: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

const GetOutstandingPayablesSchema = z.object({
  supplierId: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
});

const ListReceiptsSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const ListPaymentsSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  supplierId: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const ListTransfersSchema = z.object({
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function validateConfirmedTourQuery(tourPackageQueryId: string) {
  const query = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      confirmedVariantId: true,
      isArchived: true,
    },
  });
  if (!query) throw new NotFoundError(
    `Tour package query "${tourPackageQueryId}" not found. Use list_tour_queries to find the correct ID.`,
    "TOUR_QUERY_NOT_FOUND"
  );
  if (query.isArchived) throw new McpError(
    `Tour package query "${query.tourPackageQueryNumber ?? tourPackageQueryId}" is archived and cannot accept financial entries.`,
    "TOUR_QUERY_ARCHIVED", 422
  );
  if (!query.confirmedVariantId) throw new McpError(
    `Tour package query "${query.tourPackageQueryNumber ?? tourPackageQueryId}" (customer: ${query.customerName ?? "unknown"}) is not yet confirmed. Financial entries can only be recorded against confirmed tour queries.`,
    "TOUR_QUERY_NOT_CONFIRMED", 422,
    { queryId: query.id, queryNumber: query.tourPackageQueryNumber, customerName: query.customerName }
  );
  return query;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function listAccounts(rawParams: unknown) {
  const params = ListAccountsSchema.parse(rawParams);
  const where = params.includeInactive ? {} : { isActive: true };

  const [bankAccounts, cashAccounts] = await Promise.all([
    prismadb.bankAccount.findMany({
      where,
      select: {
        id: true,
        accountName: true,
        bankName: true,
        accountNumber: true,
        branch: true,
        openingBalance: true,
        currentBalance: true,
        isActive: true,
      },
      orderBy: { accountName: "asc" },
    }),
    prismadb.cashAccount.findMany({
      where,
      select: {
        id: true,
        accountName: true,
        openingBalance: true,
        currentBalance: true,
        isActive: true,
      },
      orderBy: { accountName: "asc" },
    }),
  ]);

  return {
    bankAccounts: bankAccounts.map((a) => ({ ...a, type: "bank" })),
    cashAccounts: cashAccounts.map((a) => ({ ...a, type: "cash" })),
    totalBalance:
      bankAccounts.reduce((s, a) => s + a.currentBalance, 0) +
      cashAccounts.reduce((s, a) => s + a.currentBalance, 0),
  };
}

async function getAccountTransactions(rawParams: unknown) {
  const params = GetAccountTransactionsSchema.parse(rawParams);
  const { accountId, accountType, limit } = params;

  if (accountType === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: accountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Bank account ${accountId} not found`, "ACCOUNT_NOT_FOUND");
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: accountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Cash account ${accountId} not found`, "ACCOUNT_NOT_FOUND");
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (params.startDate) { const d = dateToUtc(params.startDate); if (d) dateFilter.gte = d; }
  if (params.endDate) {
    const d = dateToUtc(params.endDate);
    if (d) { d.setUTCHours(23, 59, 59, 999); dateFilter.lte = d; }
  }
  const hasDates = Object.keys(dateFilter).length > 0;

  const bankFilter = accountType === "bank" ? { bankAccountId: accountId } : { cashAccountId: accountId };

  const [receipts, payments, incomes, expenses, transfersIn, transfersOut] = await Promise.all([
    prismadb.receiptDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { receiptDate: dateFilter }) },
      select: { id: true, receiptDate: true, amount: true, receiptType: true, reference: true, note: true, customer: { select: { id: true, name: true } } },
      orderBy: { receiptDate: "desc" },
      take: limit,
    }),
    prismadb.paymentDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { paymentDate: dateFilter }) },
      select: { id: true, paymentDate: true, amount: true, paymentType: true, method: true, transactionId: true, note: true, supplier: { select: { id: true, name: true } } },
      orderBy: { paymentDate: "desc" },
      take: limit,
    }),
    prismadb.incomeDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { incomeDate: dateFilter }) },
      select: { id: true, incomeDate: true, amount: true, description: true, incomeCategory: { select: { id: true, name: true } } },
      orderBy: { incomeDate: "desc" },
      take: limit,
    }),
    prismadb.expenseDetail.findMany({
      where: { ...bankFilter, ...(hasDates && { expenseDate: dateFilter }) },
      select: { id: true, expenseDate: true, amount: true, description: true, isAccrued: true, expenseCategory: { select: { id: true, name: true } } },
      orderBy: { expenseDate: "desc" },
      take: limit,
    }),
    prismadb.transfer.findMany({
      where: {
        ...(accountType === "bank" ? { toBankAccountId: accountId } : { toCashAccountId: accountId }),
        ...(hasDates && { transferDate: dateFilter }),
      },
      select: { id: true, transferDate: true, amount: true, reference: true, description: true, fromBankAccount: { select: { id: true, accountName: true } }, fromCashAccount: { select: { id: true, accountName: true } } },
      orderBy: { transferDate: "desc" },
      take: limit,
    }),
    prismadb.transfer.findMany({
      where: {
        ...(accountType === "bank" ? { fromBankAccountId: accountId } : { fromCashAccountId: accountId }),
        ...(hasDates && { transferDate: dateFilter }),
      },
      select: { id: true, transferDate: true, amount: true, reference: true, description: true, toBankAccount: { select: { id: true, accountName: true } }, toCashAccount: { select: { id: true, accountName: true } } },
      orderBy: { transferDate: "desc" },
      take: limit,
    }),
  ]);

  return {
    receipts: receipts.map((r) => ({ ...r, txType: "receipt", isInflow: true })),
    payments: payments.map((p) => ({ ...p, txType: "payment", isInflow: false })),
    incomes: incomes.map((i) => ({ ...i, txType: "income", isInflow: true })),
    expenses: expenses.map((e) => ({ ...e, txType: "expense", isInflow: false })),
    transfersIn: transfersIn.map((t) => ({ ...t, txType: "transfer_in", isInflow: true })),
    transfersOut: transfersOut.map((t) => ({ ...t, txType: "transfer_out", isInflow: false })),
  };
}

async function getFinancialSummary(rawParams: unknown) {
  const params = GetFinancialSummarySchema.parse(rawParams);
  const now = new Date();
  const startDate = params.startDate
    ? (dateToUtc(params.startDate) ?? new Date(now.getFullYear(), now.getMonth(), 1))
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = params.endDate
    ? (() => { const d = dateToUtc(params.endDate)!; d.setUTCHours(23, 59, 59, 999); return d; })()
    : now;
  const dateRange = { gte: startDate, lte: endDate };

  const [bankAccounts, cashAccounts, receipts, payments, incomes, expenses] = await Promise.all([
    prismadb.bankAccount.findMany({ where: { isActive: true }, select: { id: true, accountName: true, currentBalance: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true }, select: { id: true, accountName: true, currentBalance: true } }),
    prismadb.receiptDetail.findMany({ where: { receiptDate: dateRange }, select: { amount: true } }),
    prismadb.paymentDetail.findMany({ where: { paymentDate: dateRange }, select: { amount: true } }),
    prismadb.incomeDetail.findMany({ where: { incomeDate: dateRange }, select: { amount: true } }),
    prismadb.expenseDetail.findMany({ where: { expenseDate: dateRange, isAccrued: false }, select: { amount: true } }),
  ]);

  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const bankBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
  const cashBalance = cashAccounts.reduce((s, a) => s + a.currentBalance, 0);

  return {
    period: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    },
    inflows: { receipts: totalReceipts, incomes: totalIncome, total: totalReceipts + totalIncome },
    outflows: { payments: totalPayments, expenses: totalExpenses, total: totalPayments + totalExpenses },
    netCashFlow: totalReceipts + totalIncome - totalPayments - totalExpenses,
    balances: {
      bankTotal: bankBalance,
      cashTotal: cashBalance,
      grandTotal: bankBalance + cashBalance,
      accounts: [
        ...bankAccounts.map((a) => ({ type: "bank", ...a })),
        ...cashAccounts.map((a) => ({ type: "cash", ...a })),
      ],
    },
  };
}

async function createPayment(rawParams: unknown) {
  const params = CreatePaymentSchema.parse(rawParams);

  // tourPackageQueryId is required and query must be confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  const paymentDate = dateToUtc(params.paymentDate);
  if (!paymentDate) throw new McpError("Invalid paymentDate", "VALIDATION_ERROR", 422);

  const payment = await prismadb.paymentDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      paymentDate,
      amount: params.amount,
      method: params.method ?? null,
      transactionId: params.transactionId ?? null,
      note: params.remarks ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      supplierId: params.supplierId ?? null,
      customerId: params.customerId ?? null,
      paymentType: params.paymentType ?? "supplier_payment",
    },
  });

  // Outflow: subtract from account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  }

  return {
    ...payment,
    accountType: account.type,
    accountId: account.id,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function createReceipt(rawParams: unknown) {
  const params = CreateReceiptSchema.parse(rawParams);

  // tourPackageQueryId is required and query must be confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  const receiptDate = dateToUtc(params.receiptDate);
  if (!receiptDate) throw new McpError("Invalid receiptDate", "VALIDATION_ERROR", 422);

  const receipt = await prismadb.receiptDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      receiptDate,
      amount: params.amount,
      reference: params.reference ?? null,
      note: params.remarks ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      customerId: params.customerId ?? null,
      supplierId: params.supplierId ?? null,
      receiptType: params.receiptType ?? "customer_receipt",
    },
  });

  // Inflow: add to account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  }

  return {
    ...receipt,
    accountType: account.type,
    accountId: account.id,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function createTransfer(rawParams: unknown) {
  const params = CreateTransferSchema.parse(rawParams);

  const fromAccount = await resolveAccount({
    bankAccountId: params.fromBankAccountId,
    bankAccountName: params.fromBankAccountName,
    cashAccountId: params.fromCashAccountId,
    cashAccountName: params.fromCashAccountName,
  });
  const toAccount = await resolveAccount({
    bankAccountId: params.toBankAccountId,
    bankAccountName: params.toBankAccountName,
    cashAccountId: params.toCashAccountId,
    cashAccountName: params.toCashAccountName,
  });

  if (fromAccount.type === toAccount.type && fromAccount.id === toAccount.id) {
    throw new McpError("Cannot transfer to the same account", "VALIDATION_ERROR", 400);
  }

  const transferDate = dateToUtc(params.transferDate);
  if (!transferDate) throw new McpError("Invalid transferDate", "VALIDATION_ERROR", 422);

  const transfer = await prismadb.transfer.create({
    data: {
      transferDate,
      amount: params.amount,
      reference: params.reference ?? null,
      description: params.description ?? null,
      fromBankAccountId: fromAccount.type === "bank" ? fromAccount.id : null,
      fromCashAccountId: fromAccount.type === "cash" ? fromAccount.id : null,
      toBankAccountId: toAccount.type === "bank" ? toAccount.id : null,
      toCashAccountId: toAccount.type === "cash" ? toAccount.id : null,
    },
    include: {
      fromBankAccount: { select: { id: true, accountName: true } },
      fromCashAccount: { select: { id: true, accountName: true } },
      toBankAccount: { select: { id: true, accountName: true } },
      toCashAccount: { select: { id: true, accountName: true } },
    },
  });

  // Update source account — outflow
  if (fromAccount.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: fromAccount.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: fromAccount.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: fromAccount.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: fromAccount.id }, data: { currentBalance: acct.currentBalance - params.amount } });
  }

  // Update destination account — inflow
  if (toAccount.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: toAccount.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: toAccount.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: toAccount.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: toAccount.id }, data: { currentBalance: acct.currentBalance + params.amount } });
  }

  return transfer;
}

async function allocateReceiptToSale(rawParams: unknown) {
  const { receiptDetailId, saleDetailId, allocatedAmount, note } = AllocateReceiptToSaleSchema.parse(rawParams);

  // Validate receipt exists
  const receipt = await prismadb.receiptDetail.findUnique({
    where: { id: receiptDetailId },
    select: { id: true, amount: true },
  });
  if (!receipt) throw new NotFoundError(`Receipt ${receiptDetailId} not found`);

  // Validate sale exists
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: saleDetailId },
    select: { id: true, salePrice: true, gstAmount: true },
  });
  if (!sale) throw new NotFoundError(`Sale ${saleDetailId} not found`);

  // Check allocation does not exceed receipt amount
  const existingReceiptAllocations = await prismadb.receiptSaleAllocation.findMany({
    where: { receiptDetailId },
    select: { allocatedAmount: true },
  });
  const totalAllocated = existingReceiptAllocations.reduce((s, a) => s + a.allocatedAmount, 0);
  if (totalAllocated + allocatedAmount > receipt.amount) {
    throw new McpError(
      `Allocation would exceed receipt amount. Receipt: ${receipt.amount}, already allocated: ${totalAllocated}, requested: ${allocatedAmount}`,
      "ALLOCATION_EXCEEDED", 422
    );
  }

  // Check allocation does not exceed sale total
  const existingSaleAllocations = await prismadb.receiptSaleAllocation.findMany({
    where: { saleDetailId },
    select: { allocatedAmount: true },
  });
  const totalSaleAllocated = existingSaleAllocations.reduce((s, a) => s + a.allocatedAmount, 0);
  const saleTotal = sale.salePrice + (sale.gstAmount ?? 0);
  if (totalSaleAllocated + allocatedAmount > saleTotal) {
    throw new McpError(
      `Allocation would exceed sale total. Sale total: ${saleTotal}, already allocated: ${totalSaleAllocated}, requested: ${allocatedAmount}`,
      "ALLOCATION_EXCEEDED", 422
    );
  }

  return prismadb.receiptSaleAllocation.create({
    data: { receiptDetailId, saleDetailId, allocatedAmount, note: note ?? null },
  });
}

async function allocatePaymentToPurchase(rawParams: unknown) {
  const { paymentDetailId, purchaseDetailId, allocatedAmount, note } = AllocatePaymentToPurchaseSchema.parse(rawParams);

  // Validate payment exists
  const payment = await prismadb.paymentDetail.findUnique({
    where: { id: paymentDetailId },
    select: { id: true, amount: true },
  });
  if (!payment) throw new NotFoundError(`Payment ${paymentDetailId} not found`);

  // Validate purchase exists
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: purchaseDetailId },
    select: { id: true, price: true, gstAmount: true, netPayable: true },
  });
  if (!purchase) throw new NotFoundError(`Purchase ${purchaseDetailId} not found`);

  // Check allocation does not exceed payment amount
  const existingPaymentAllocations = await prismadb.paymentPurchaseAllocation.findMany({
    where: { paymentDetailId },
    select: { allocatedAmount: true },
  });
  const totalAllocated = existingPaymentAllocations.reduce((s, a) => s + a.allocatedAmount, 0);
  if (totalAllocated + allocatedAmount > payment.amount) {
    throw new McpError(
      `Allocation would exceed payment amount. Payment: ${payment.amount}, already allocated: ${totalAllocated}, requested: ${allocatedAmount}`,
      "ALLOCATION_EXCEEDED", 422
    );
  }

  // Check allocation does not exceed purchase total
  const existingPurchaseAllocations = await prismadb.paymentPurchaseAllocation.findMany({
    where: { purchaseDetailId },
    select: { allocatedAmount: true },
  });
  const totalPurchaseAllocated = existingPurchaseAllocations.reduce((s, a) => s + a.allocatedAmount, 0);
  const purchaseTotal = purchase.netPayable ?? (purchase.price + (purchase.gstAmount ?? 0));
  if (totalPurchaseAllocated + allocatedAmount > purchaseTotal) {
    throw new McpError(
      `Allocation would exceed purchase total. Purchase total: ${purchaseTotal}, already allocated: ${totalPurchaseAllocated}, requested: ${allocatedAmount}`,
      "ALLOCATION_EXCEEDED", 422
    );
  }

  return prismadb.paymentPurchaseAllocation.create({
    data: { paymentDetailId, purchaseDetailId, allocatedAmount, note: note ?? null },
  });
}

async function getOutstandingReceivables(rawParams: unknown) {
  const { customerId, limit } = GetOutstandingReceivablesSchema.parse(rawParams);
  const sales = await prismadb.saleDetail.findMany({
    where: { ...(customerId && { customerId }) },
    include: {
      receiptAllocations: { select: { allocatedAmount: true } },
      customer: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
    },
    orderBy: { saleDate: "desc" },
    take: limit,
  });

  const items = sales
    .map((s) => {
      const invoiced = s.salePrice + (s.gstAmount ?? 0);
      const received = s.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      const balance = invoiced - received;
      return {
        saleId: s.id, invoiceNumber: s.invoiceNumber, saleDate: s.saleDate, dueDate: s.dueDate,
        invoiced, received, balance,
        customer: s.customer, tourPackageQuery: s.tourPackageQuery,
      };
    })
    .filter((i) => i.balance > 0.01);

  return {
    totalOutstanding: items.reduce((s, i) => s + i.balance, 0),
    count: items.length,
    items,
  };
}

async function getOutstandingPayables(rawParams: unknown) {
  const { supplierId, limit } = GetOutstandingPayablesSchema.parse(rawParams);
  const purchases = await prismadb.purchaseDetail.findMany({
    where: { ...(supplierId && { supplierId }) },
    include: {
      paymentAllocations: { select: { allocatedAmount: true } },
      supplier: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
    },
    orderBy: { purchaseDate: "desc" },
    take: limit,
  });

  const items = purchases
    .map((p) => {
      const billed = p.netPayable ?? (p.price + (p.gstAmount ?? 0));
      const paid = p.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      const balance = billed - paid;
      return {
        purchaseId: p.id, billNumber: p.billNumber, purchaseDate: p.purchaseDate, dueDate: p.dueDate,
        billed, paid, balance,
        supplier: p.supplier, tourPackageQuery: p.tourPackageQuery,
      };
    })
    .filter((i) => i.balance > 0.01);

  return {
    totalOutstanding: items.reduce((s, i) => s + i.balance, 0),
    count: items.length,
    items,
  };
}

async function listReceipts(rawParams: unknown) {
  const { tourPackageQueryId, customerId, startDate, endDate, limit } = ListReceiptsSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.receiptDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(customerId && { customerId }),
      ...(dateFilter && { receiptDate: dateFilter }),
    },
    select: {
      id: true, receiptDate: true, amount: true, reference: true, note: true, receiptType: true,
      customer: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      bankAccount: { select: { id: true, accountName: true } },
      cashAccount: { select: { id: true, accountName: true } },
      saleAllocations: { select: { saleDetailId: true, allocatedAmount: true } },
    },
    orderBy: { receiptDate: "desc" },
    take: limit,
  });
}

async function listPayments(rawParams: unknown) {
  const { tourPackageQueryId, supplierId, startDate, endDate, limit } = ListPaymentsSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.paymentDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(supplierId && { supplierId }),
      ...(dateFilter && { paymentDate: dateFilter }),
    },
    select: {
      id: true, paymentDate: true, amount: true, method: true, transactionId: true, note: true, paymentType: true,
      supplier: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      bankAccount: { select: { id: true, accountName: true } },
      cashAccount: { select: { id: true, accountName: true } },
      purchaseAllocations: { select: { purchaseDetailId: true, allocatedAmount: true } },
    },
    orderBy: { paymentDate: "desc" },
    take: limit,
  });
}

async function listTransfers(rawParams: unknown) {
  const { startDate, endDate, limit } = ListTransfersSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.transfer.findMany({
    where: {
      ...(dateFilter && { transferDate: dateFilter }),
    },
    select: {
      id: true, transferDate: true, amount: true, reference: true, description: true,
      fromBankAccount: { select: { id: true, accountName: true } },
      fromCashAccount: { select: { id: true, accountName: true } },
      toBankAccount: { select: { id: true, accountName: true } },
      toCashAccount: { select: { id: true, accountName: true } },
    },
    orderBy: { transferDate: "desc" },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const financeHandlers: ToolHandlerMap = {
  list_accounts: listAccounts,
  get_account_transactions: getAccountTransactions,
  get_financial_summary: getFinancialSummary,
  create_payment: createPayment,
  create_receipt: createReceipt,
  create_transfer: createTransfer,
  allocate_receipt_to_sale: allocateReceiptToSale,
  allocate_payment_to_purchase: allocatePaymentToPurchase,
  get_outstanding_receivables: getOutstandingReceivables,
  get_outstanding_payables: getOutstandingPayables,
  list_receipts: listReceipts,
  list_payments: listPayments,
  list_transfers: listTransfers,
};
