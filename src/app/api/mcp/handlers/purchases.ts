import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { buildDateFilter } from "../lib/date-filter";
import { resolveSupplier } from "../lib/resolve-entity";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListPurchasesSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const GetPurchaseSchema = z.object({
  purchaseId: z.string().min(1),
});

const CreatePurchaseSchema = z.object({
  tourPackageQueryId: z.string().min(1),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  purchaseDate: isoDateString,
  price: z.number().positive(),
  description: z.string().optional(),
  gstAmount: z.number().min(0).optional(),
  gstPercentage: z.number().min(0).optional(),
  billNumber: z.string().optional(),
  dueDate: isoDateString.optional(),
  isGst: z.boolean().optional().default(true),
  netPayable: z.number().optional(),
  tdsAmount: z.number().min(0).optional(),
});

const GetPurchaseBalanceSchema = z.object({
  purchaseId: z.string().min(1),
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

async function listPurchases(rawParams: unknown) {
  const { tourPackageQueryId, supplierId, status, startDate, endDate, limit } = ListPurchasesSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.purchaseDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(supplierId && { supplierId }),
      ...(status && { status }),
      ...(dateFilter && { purchaseDate: dateFilter }),
    },
    select: {
      id: true, purchaseDate: true, price: true, gstAmount: true, netPayable: true,
      billNumber: true, status: true, description: true, dueDate: true, tdsAmount: true,
      supplier: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      paymentAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { purchaseDate: "desc" },
    take: limit,
  });
}

async function getPurchase(rawParams: unknown) {
  const { purchaseId } = GetPurchaseSchema.parse(rawParams);
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: purchaseId },
    include: {
      supplier: { select: { id: true, name: true, contact: true, gstNumber: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      items: { orderBy: { orderIndex: "asc" } },
      paymentAllocations: {
        include: { paymentDetail: { select: { id: true, paymentDate: true, amount: true, method: true } } },
      },
      purchaseReturns: { select: { id: true, returnDate: true, amount: true, gstAmount: true, status: true } },
    },
  });
  if (!purchase) throw new NotFoundError(`Purchase ${purchaseId} not found`);
  return purchase;
}

async function createPurchase(rawParams: unknown) {
  const params = CreatePurchaseSchema.parse(rawParams);

  // Validate tour query is confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  // Resolve supplier if needed
  let supplierId = params.supplierId ?? null;
  if (!supplierId && params.supplierName) {
    const s = await resolveSupplier({ supplierName: params.supplierName });
    supplierId = s.id;
  }

  const purchaseDate = dateToUtc(params.purchaseDate);
  if (!purchaseDate) throw new McpError("Invalid purchaseDate", "VALIDATION_ERROR", 422);

  const dueDate = params.dueDate ? dateToUtc(params.dueDate) ?? null : null;

  const purchase = await prismadb.purchaseDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      supplierId,
      purchaseDate,
      price: params.price,
      description: params.description ?? null,
      gstAmount: params.gstAmount ?? null,
      gstPercentage: params.gstPercentage ?? null,
      billNumber: params.billNumber ?? null,
      dueDate,
      isGst: params.isGst ?? true,
      netPayable: params.netPayable ?? null,
      tdsAmount: params.tdsAmount ?? null,
      status: "pending",
    },
  });

  return {
    ...purchase,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function getPurchaseBalance(rawParams: unknown) {
  const { purchaseId } = GetPurchaseBalanceSchema.parse(rawParams);
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: purchaseId },
    include: { paymentAllocations: { select: { allocatedAmount: true } } },
  });
  if (!purchase) throw new NotFoundError(`Purchase ${purchaseId} not found`);

  const billed = purchase.netPayable ?? (purchase.price + (purchase.gstAmount ?? 0));
  const paid = purchase.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

  return {
    purchaseId: purchase.id,
    billNumber: purchase.billNumber,
    billed,
    paid,
    balance: billed - paid,
    status: purchase.status,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const purchaseHandlers: ToolHandlerMap = {
  list_purchases: listPurchases,
  get_purchase: getPurchase,
  create_purchase: createPurchase,
  get_purchase_balance: getPurchaseBalance,
};
