import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { buildDateFilter } from "../lib/date-filter";
import { resolveCustomer } from "../lib/resolve-entity";

// ── Schemas ──────────────────────────────────────────────────────────────────

const ListSalesSchema = z.object({
  tourPackageQueryId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.string().optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const GetSaleSchema = z.object({
  saleId: z.string().min(1),
});

const CreateSaleSchema = z.object({
  tourPackageQueryId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  saleDate: isoDateString,
  salePrice: z.number().positive(),
  description: z.string().optional(),
  gstAmount: z.number().min(0).optional(),
  gstPercentage: z.number().min(0).optional(),
  invoiceNumber: z.string().optional(),
  dueDate: isoDateString.optional(),
  isGst: z.boolean().optional().default(true),
});

const GetSaleBalanceSchema = z.object({
  saleId: z.string().min(1),
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

async function listSales(rawParams: unknown) {
  const { tourPackageQueryId, customerId, status, startDate, endDate, limit } = ListSalesSchema.parse(rawParams);
  const dateFilter = buildDateFilter(startDate, endDate);
  return prismadb.saleDetail.findMany({
    where: {
      ...(tourPackageQueryId && { tourPackageQueryId }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(dateFilter && { saleDate: dateFilter }),
    },
    select: {
      id: true, saleDate: true, salePrice: true, gstAmount: true, invoiceNumber: true,
      status: true, description: true, dueDate: true,
      customer: { select: { id: true, name: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      receiptAllocations: { select: { allocatedAmount: true } },
    },
    orderBy: { saleDate: "desc" },
    take: limit,
  });
}

async function getSale(rawParams: unknown) {
  const { saleId } = GetSaleSchema.parse(rawParams);
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: saleId },
    include: {
      customer: { select: { id: true, name: true, contact: true } },
      tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true, customerName: true } },
      items: { orderBy: { orderIndex: "asc" } },
      receiptAllocations: {
        include: { receiptDetail: { select: { id: true, receiptDate: true, amount: true, reference: true } } },
      },
      saleReturns: { select: { id: true, returnDate: true, amount: true, gstAmount: true, status: true } },
    },
  });
  if (!sale) throw new NotFoundError(`Sale ${saleId} not found`);
  return sale;
}

async function createSale(rawParams: unknown) {
  const params = CreateSaleSchema.parse(rawParams);

  // Validate tour query is confirmed
  const tourQuery = await validateConfirmedTourQuery(params.tourPackageQueryId);

  // Resolve customer if needed
  let customerId = params.customerId ?? null;
  if (!customerId && params.customerName) {
    const c = await resolveCustomer({ customerName: params.customerName });
    customerId = c.id;
  }

  const saleDate = dateToUtc(params.saleDate);
  if (!saleDate) throw new McpError("Invalid saleDate", "VALIDATION_ERROR", 422);

  const dueDate = params.dueDate ? dateToUtc(params.dueDate) ?? null : null;

  const sale = await prismadb.saleDetail.create({
    data: {
      tourPackageQueryId: params.tourPackageQueryId,
      customerId,
      saleDate,
      salePrice: params.salePrice,
      description: params.description ?? null,
      gstAmount: params.gstAmount ?? null,
      gstPercentage: params.gstPercentage ?? null,
      invoiceNumber: params.invoiceNumber ?? null,
      dueDate,
      isGst: params.isGst ?? true,
      status: "pending",
    },
  });

  return {
    ...sale,
    tourQuery: { id: tourQuery.id, queryNumber: tourQuery.tourPackageQueryNumber, customerName: tourQuery.customerName },
  };
}

async function getSaleBalance(rawParams: unknown) {
  const { saleId } = GetSaleBalanceSchema.parse(rawParams);
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: saleId },
    include: { receiptAllocations: { select: { allocatedAmount: true } } },
  });
  if (!sale) throw new NotFoundError(`Sale ${saleId} not found`);

  const invoiced = sale.salePrice + (sale.gstAmount ?? 0);
  const received = sale.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);

  return {
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    invoiced,
    received,
    balance: invoiced - received,
    status: sale.status,
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const saleHandlers: ToolHandlerMap = {
  list_sales: listSales,
  get_sale: getSale,
  create_sale: createSale,
  get_sale_balance: getSaleBalance,
};
