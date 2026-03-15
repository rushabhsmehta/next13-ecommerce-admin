import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { resolveAccount } from "../lib/resolve-account";
import { buildDateFilter } from "../lib/date-filter";

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateExpenseSchema = z.object({
  expenseDate: isoDateString,
  amount: z.number().positive(),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  expenseCategoryName: z.string().optional(),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const DeleteExpenseSchema = z.object({
  expenseId: z.string().min(1),
});

const CreateIncomeSchema = z.object({
  incomeDate: isoDateString,
  amount: z.number().positive(),
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
  incomeCategoryId: z.string().optional(),
  incomeCategoryName: z.string().optional(),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

const ListExpensesSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  expenseCategoryId: z.string().optional(),
  isAccrued: z.boolean().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const ListIncomesSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  incomeCategoryId: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const ListExpenseCategoriesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const ListIncomeCategoriesSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const CreateAccruedExpenseSchema = z.object({
  accruedDate: isoDateString,
  amount: z.number().positive(),
  expenseCategoryId: z.string().optional(),
  expenseCategoryName: z.string().optional(),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
});

const PayAccruedExpenseSchema = z.object({
  expenseId: z.string().min(1),
  paidDate: isoDateString,
  bankAccountId: z.string().optional(),
  bankAccountName: z.string().optional(),
  cashAccountId: z.string().optional(),
  cashAccountName: z.string().optional(),
}).refine(
  (d) => !!(d.bankAccountId || d.bankAccountName || d.cashAccountId || d.cashAccountName),
  { message: "Provide bankAccountId, bankAccountName, cashAccountId, or cashAccountName", path: ["bankAccountId"] }
);

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

async function createExpense(rawParams: unknown) {
  const params = CreateExpenseSchema.parse(rawParams);
  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  // If tourPackageQueryId provided, it must belong to a confirmed query
  let tourQuery: { id: string; tourPackageQueryNumber: string | null; customerName: string | null } | null = null;
  if (params.tourPackageQueryId) {
    tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);
  }

  let expenseCategoryId = params.expenseCategoryId ?? null;
  if (!expenseCategoryId && params.expenseCategoryName) {
    const cat = await prismadb.expenseCategory.findFirst({
      where: { name: { contains: params.expenseCategoryName }, isActive: true },
      select: { id: true },
    });
    if (!cat) throw new NotFoundError(`Expense category "${params.expenseCategoryName}" not found`, "CATEGORY_NOT_FOUND");
    expenseCategoryId = cat.id;
  }

  const expenseDate = dateToUtc(params.expenseDate);
  if (!expenseDate) throw new McpError("Invalid expenseDate", "VALIDATION_ERROR", 422);

  const expense = await prismadb.expenseDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      expenseDate,
      amount: params.amount,
      expenseCategoryId,
      description: params.description ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
      isAccrued: false,
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
    ...expense,
    accountType: account.type,
    accountId: account.id,
    ...(tourQuery && { tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName } }),
  };
}

async function deleteExpense(rawParams: unknown) {
  const { expenseId } = DeleteExpenseSchema.parse(rawParams);

  // Get expense to revert account balances
  const expense = await prismadb.expenseDetail.findUnique({
    where: { id: expenseId },
    include: {
      bankAccount: true,
      cashAccount: true
    }
  });

  if (!expense) {
    throw new NotFoundError(`Expense ${expenseId} not found`, "EXPENSE_NOT_FOUND");
  }

  // Revert account balance only if expense was paid (not accrued)
  if (!expense.isAccrued) {
    if (expense.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: expense.bankAccountId },
        data: {
          currentBalance: expense.bankAccount!.currentBalance + expense.amount
        }
      });
    } else if (expense.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: expense.cashAccountId },
        data: {
          currentBalance: expense.cashAccount!.currentBalance + expense.amount
        }
      });
    }
  }

  // Delete the expense
  await prismadb.expenseDetail.delete({
    where: {
      id: expenseId
    }
  });

  return { message: "Expense deleted successfully", expenseId };
}

async function createIncome(rawParams: unknown) {
  const params = CreateIncomeSchema.parse(rawParams);
  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  // If tourPackageQueryId provided, it must belong to a confirmed query
  let tourQuery: { id: string; tourPackageQueryNumber: string | null; customerName: string | null } | null = null;
  if (params.tourPackageQueryId) {
    tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);
  }

  let incomeCategoryId = params.incomeCategoryId ?? null;
  if (!incomeCategoryId && params.incomeCategoryName) {
    const cat = await prismadb.incomeCategory.findFirst({
      where: { name: { contains: params.incomeCategoryName }, isActive: true },
      select: { id: true },
    });
    if (!cat) throw new NotFoundError(`Income category "${params.incomeCategoryName}" not found`, "CATEGORY_NOT_FOUND");
    incomeCategoryId = cat.id;
  }

  const incomeDate = dateToUtc(params.incomeDate);
  if (!incomeDate) throw new McpError("Invalid incomeDate", "VALIDATION_ERROR", 422);

  const income = await prismadb.incomeDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      incomeDate,
      amount: params.amount,
      incomeCategoryId,
      description: params.description ?? null,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
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
    ...income,
    accountType: account.type,
    accountId: account.id,
    ...(tourQuery && { tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName } }),
  };
}

async function listExpenses(rawParams: unknown) {
  const { tourPackageQueryId, expenseCategoryId, isAccrued, startDate, endDate, limit } = ListExpensesSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.expenseDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(expenseCategoryId && { expenseCategoryId }),
      ...(isAccrued !== undefined && { isAccrued }),
      ...(dateFilter && { expenseDate: dateFilter }),
    },
    select: {
      id: true, expenseDate: true, amount: true, description: true, isAccrued: true, accruedDate: true, paidDate: true,
      expenseCategory: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      bankAccount: { select: { id: true, accountName: true } },
      cashAccount: { select: { id: true, accountName: true } },
    },
    orderBy: { expenseDate: "desc" },
    take: limit,
  });
}

async function listIncomes(rawParams: unknown) {
  const { tourPackageQueryId, incomeCategoryId, startDate, endDate, limit } = ListIncomesSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.incomeDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(incomeCategoryId && { incomeCategoryId }),
      ...(dateFilter && { incomeDate: dateFilter }),
    },
    select: {
      id: true, incomeDate: true, amount: true, description: true,
      incomeCategory: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      bankAccount: { select: { id: true, accountName: true } },
      cashAccount: { select: { id: true, accountName: true } },
    },
    orderBy: { incomeDate: "desc" },
    take: limit,
  });
}

async function listExpenseCategories(rawParams: unknown) {
  const { includeInactive } = ListExpenseCategoriesSchema.parse(rawParams);
  return prismadb.expenseCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, description: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

async function listIncomeCategories(rawParams: unknown) {
  const { includeInactive } = ListIncomeCategoriesSchema.parse(rawParams);
  return prismadb.incomeCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: { id: true, name: true, description: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

async function createAccruedExpense(rawParams: unknown) {
  const params = CreateAccruedExpenseSchema.parse(rawParams);

  // If tourPackageQueryId provided, it must belong to a confirmed query
  let tourQuery: { id: string; tourPackageQueryNumber: string | null; customerName: string | null } | null = null;
  if (params.tourPackageQueryId) {
    tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);
  }

  let expenseCategoryId = params.expenseCategoryId ?? null;
  if (!expenseCategoryId && params.expenseCategoryName) {
    const cat = await prismadb.expenseCategory.findFirst({
      where: { name: { contains: params.expenseCategoryName }, isActive: true },
      select: { id: true },
    });
    if (!cat) throw new NotFoundError(`Expense category "${params.expenseCategoryName}" not found`, "CATEGORY_NOT_FOUND");
    expenseCategoryId = cat.id;
  }

  const accruedDate = dateToUtc(params.accruedDate);
  if (!accruedDate) throw new McpError("Invalid accruedDate", "VALIDATION_ERROR", 422);

  const expense = await prismadb.expenseDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId ?? null,
      expenseDate: accruedDate,
      accruedDate,
      amount: params.amount,
      expenseCategoryId,
      description: params.description ?? null,
      isAccrued: true,
      // No account debit for accrued expenses
      bankAccountId: null,
      cashAccountId: null,
    },
  });

  return {
    ...expense,
    ...(tourQuery && { tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName } }),
  };
}

async function payAccruedExpense(rawParams: unknown) {
  const params = PayAccruedExpenseSchema.parse(rawParams);

  const expense = await prismadb.expenseDetail.findUnique({
    where: { id: params.expenseId },
    select: { id: true, isAccrued: true, amount: true, paidDate: true },
  });
  if (!expense) throw new NotFoundError(`Expense ${params.expenseId} not found`);
  if (!expense.isAccrued) throw new McpError("Expense is not accrued", "VALIDATION_ERROR", 422);
  if (expense.paidDate) throw new McpError("Accrued expense is already paid", "ALREADY_PAID", 409);

  const account = await resolveAccount({
    bankAccountId: params.bankAccountId,
    bankAccountName: params.bankAccountName,
    cashAccountId: params.cashAccountId,
    cashAccountName: params.cashAccountName,
  });

  const paidDate = dateToUtc(params.paidDate);
  if (!paidDate) throw new McpError("Invalid paidDate", "VALIDATION_ERROR", 422);

  const updated = await prismadb.expenseDetail.update({
    where: { id: params.expenseId },
    data: {
      paidDate,
      bankAccountId: account.type === "bank" ? account.id : null,
      cashAccountId: account.type === "cash" ? account.id : null,
    },
  });

  // Outflow: subtract from account balance
  if (account.type === "bank") {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.bankAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - expense.amount } });
  } else {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: account.id } });
    if (acct) await prismadb.cashAccount.update({ where: { id: account.id }, data: { currentBalance: acct.currentBalance - expense.amount } });
  }

  return {
    ...updated,
    accountType: account.type,
    accountId: account.id,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const expenseIncomeHandlers: ToolHandlerMap = {
  create_expense: createExpense,
  delete_expense: deleteExpense,
  create_income: createIncome,
  list_expenses: listExpenses,
  list_incomes: listIncomes,
  list_expense_categories: listExpenseCategories,
  list_income_categories: listIncomeCategories,
  create_accrued_expense: createAccruedExpense,
  pay_accrued_expense: payAccruedExpense,
};
