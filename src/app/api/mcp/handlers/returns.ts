import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { buildDateFilter } from "../lib/date-filter";

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateSaleReturnSchema = z.object({
  saleDetailId: z.string().min(1),
  returnDate: isoDateString,
  amount: z.number().positive(),
  gstAmount: z.number().min(0).optional(),
  returnReason: z.string().optional(),
  reference: z.string().optional(),
});

const ListSaleReturnsSchema = z.object({
  saleDetailId: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const CreatePurchaseReturnSchema = z.object({
  purchaseDetailId: z.string().min(1),
  returnDate: isoDateString,
  amount: z.number().positive(),
  gstAmount: z.number().min(0).optional(),
  returnReason: z.string().optional(),
  reference: z.string().optional(),
});

const ListPurchaseReturnsSchema = z.object({
  purchaseDetailId: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function createSaleReturn(rawParams: unknown) {
  const params = CreateSaleReturnSchema.parse(rawParams);

  // Validate sale exists
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: params.saleDetailId },
    select: { id: true, salePrice: true, gstAmount: true },
  });
  if (!sale) throw new NotFoundError(`Sale ${params.saleDetailId} not found`);

  // Validate return amount does not exceed sale amount
  const existingReturns = await prismadb.saleReturn.findMany({
    where: { saleDetailId: params.saleDetailId },
    select: { amount: true },
  });
  const totalReturned = existingReturns.reduce((s, r) => s + r.amount, 0);
  const saleTotal = sale.salePrice + (sale.gstAmount ?? 0);
  if (totalReturned + params.amount > saleTotal) {
    throw new McpError(
      `Return amount would exceed sale total. Sale: ${saleTotal}, already returned: ${totalReturned}, requested: ${params.amount}`,
      "AMOUNT_EXCEEDED", 422
    );
  }

  const returnDate = dateToUtc(params.returnDate);
  if (!returnDate) throw new McpError("Invalid returnDate", "VALIDATION_ERROR", 422);

  return prismadb.saleReturn.create({
    data: {
      saleDetailId: params.saleDetailId,
      returnDate,
      amount: params.amount,
      gstAmount: params.gstAmount ?? null,
      returnReason: params.returnReason ?? null,
      reference: params.reference ?? null,
      status: "pending",
    },
  });
}

async function listSaleReturns(rawParams: unknown) {
  const { saleDetailId, startDate, endDate, limit } = ListSaleReturnsSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.saleReturn.findMany({
    where: {
      ...(saleDetailId && { saleDetailId }),
      ...(dateFilter && { returnDate: dateFilter }),
    },
    select: {
      id: true, returnDate: true, amount: true, gstAmount: true, returnReason: true, reference: true, status: true,
      saleDetail: {
        select: {
          id: true, invoiceNumber: true, salePrice: true,
          tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
          customer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { returnDate: "desc" },
    take: limit,
  });
}

async function createPurchaseReturn(rawParams: unknown) {
  const params = CreatePurchaseReturnSchema.parse(rawParams);

  // Validate purchase exists
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: params.purchaseDetailId },
    select: { id: true, price: true, gstAmount: true, netPayable: true },
  });
  if (!purchase) throw new NotFoundError(`Purchase ${params.purchaseDetailId} not found`);

  // Validate return amount does not exceed purchase amount
  const existingReturns = await prismadb.purchaseReturn.findMany({
    where: { purchaseDetailId: params.purchaseDetailId },
    select: { amount: true },
  });
  const totalReturned = existingReturns.reduce((s, r) => s + r.amount, 0);
  const purchaseTotal = purchase.netPayable ?? (purchase.price + (purchase.gstAmount ?? 0));
  if (totalReturned + params.amount > purchaseTotal) {
    throw new McpError(
      `Return amount would exceed purchase total. Purchase: ${purchaseTotal}, already returned: ${totalReturned}, requested: ${params.amount}`,
      "AMOUNT_EXCEEDED", 422
    );
  }

  const returnDate = dateToUtc(params.returnDate);
  if (!returnDate) throw new McpError("Invalid returnDate", "VALIDATION_ERROR", 422);

  return prismadb.purchaseReturn.create({
    data: {
      purchaseDetailId: params.purchaseDetailId,
      returnDate,
      amount: params.amount,
      gstAmount: params.gstAmount ?? null,
      returnReason: params.returnReason ?? null,
      reference: params.reference ?? null,
      status: "pending",
    },
  });
}

async function listPurchaseReturns(rawParams: unknown) {
  const { purchaseDetailId, startDate, endDate, limit } = ListPurchaseReturnsSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.purchaseReturn.findMany({
    where: {
      ...(purchaseDetailId && { purchaseDetailId }),
      ...(dateFilter && { returnDate: dateFilter }),
    },
    select: {
      id: true, returnDate: true, amount: true, gstAmount: true, returnReason: true, reference: true, status: true,
      purchaseDetail: {
        select: {
          id: true, billNumber: true, price: true,
          tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
          supplier: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { returnDate: "desc" },
    take: limit,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const returnHandlers: ToolHandlerMap = {
  create_sale_return: createSaleReturn,
  list_sale_returns: listSaleReturns,
  create_purchase_return: createPurchaseReturn,
  list_purchase_returns: listPurchaseReturns,
};
