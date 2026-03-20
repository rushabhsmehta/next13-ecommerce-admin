import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateTourQuerySchema = z.object({
  customerName: z.string().min(1),
  customerNumber: z.string().optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  numDaysNight: z.string().optional(),
  tourCategory: z.enum(["Domestic", "International"]).optional(),
  tourPackageQueryType: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  tourStartsFrom: isoDateString.optional(),
  tourEndsOn: isoDateString.optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  remarks: z.string().optional(),
  inquiryId: z.string().optional(),
  price: z.string().optional(),
  totalPrice: z.string().optional(),
}).refine((d: { locationId?: string; locationName?: string }) => !!(d.locationId || d.locationName), {
  message: "locationId or locationName is required",
  path: ["locationId"],
});

const ListTourQueriesSchema = z.object({
  locationId: z.string().optional(),
  customerName: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(20),
});

const GetTourQuerySchema = z.object({
  tourPackageQueryId: z.string().min(1),
});

const ConfirmTourQuerySchema = z.object({
  tourPackageQueryId: z.string().min(1),
  confirmedVariantId: z.string().optional(),
});

const GetQueryFinancialSummarySchema = z.object({
  tourPackageQueryId: z.string().min(1),
});

const UpdateTourQuerySchema = z.object({
  tourPackageQueryId: z.string().min(1),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  tourStartsFrom: isoDateString.optional(),
  tourEndsOn: isoDateString.optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  remarks: z.string().optional(),
  totalPrice: z.string().optional(),
});

const ArchiveTourQuerySchema = z.object({
  tourPackageQueryId: z.string().min(1),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

async function createTourQuery(rawParams: unknown) {
  const params = CreateTourQuerySchema.parse(rawParams);
  let locationId = params.locationId;

  if (!locationId && params.locationName) {
    const loc = await prismadb.location.findFirst({
      where: { isActive: true, label: { contains: params.locationName } },
    });
    if (!loc) throw new NotFoundError(
      `Location "${params.locationName}" not found. Call search_locations first to find the correct name.`,
      "LOCATION_NOT_FOUND"
    );
    locationId = loc.id;
  }

  // locationId is guaranteed by the Zod refine — narrowing for TypeScript
  const resolvedLocationId = locationId!;

  // Generate a collision-resistant query number using milliseconds + random suffix
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const queryNumber = `TPQ-${datePart}-${Date.now()}-${randomSuffix}`;

  // Zod already validated the date strings; dateToUtc returns undefined only for falsy input
  const tourStartsFrom = params.tourStartsFrom ? dateToUtc(params.tourStartsFrom) ?? null : null;
  const tourEndsOn = params.tourEndsOn ? dateToUtc(params.tourEndsOn) ?? null : null;

  const query = await prismadb.tourPackageQuery.create({
    data: {
      tourPackageQueryNumber: queryNumber,
      customerName: params.customerName,
      customerNumber: params.customerNumber ?? null,
      locationId: resolvedLocationId,
      tourCategory: (params.tourCategory as any) ?? "Domestic",
      tourPackageQueryType: params.tourPackageQueryType ?? null,
      numDaysNight: params.numDaysNight ?? null,
      numAdults: params.numAdults ?? null,
      numChild5to12: params.numChild5to12 ?? null,
      numChild0to5: params.numChild0to5 ?? null,
      tourStartsFrom,
      tourEndsOn,
      transport: params.transport ?? null,
      pickup_location: params.pickup_location ?? null,
      drop_location: params.drop_location ?? null,
      remarks: params.remarks ?? null,
      inquiryId: params.inquiryId ?? null,
      price: params.price ?? null,
      totalPrice: params.totalPrice ?? null,
      isFeatured: false,
      isArchived: false,
    } as any,
    include: {
      location: { select: { id: true, label: true } },
    },
  });

  return query;
}

async function listTourQueries(rawParams: unknown) {
  const params = ListTourQueriesSchema.parse(rawParams);
  const { locationId, customerName, limit } = params;
  const result = await prismadb.tourPackageQuery.findMany({
    where: {
      isArchived: false,
      ...(locationId && { locationId }),
      ...(customerName && { customerName: { contains: customerName } }),
    },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      customerNumber: true,
      tourCategory: true,
      numDaysNight: true,
      totalPrice: true,
      tourStartsFrom: true,
      tourEndsOn: true,
      remarks: true,
      confirmedVariantId: true,
      createdAt: true,
      location: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return result;
}

async function getTourQuery(rawParams: unknown) {
  const { tourPackageQueryId } = GetTourQuerySchema.parse(rawParams);
  const q = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    include: {
      location: { select: { id: true, label: true } },
      itineraries: {
        include: {
          activities: true,
          roomAllocations: { include: { roomType: true, occupancyType: true, mealPlan: true, extraBeds: { include: { occupancyType: true } } } },
        },
        orderBy: { dayNumber: "asc" },
      },
      saleDetails: { select: { id: true, salePrice: true, gstAmount: true, status: true, invoiceNumber: true } },
      purchaseDetails: { select: { id: true, price: true, gstAmount: true, status: true, billNumber: true } },
      receiptDetails: { select: { id: true, amount: true, receiptDate: true } },
      paymentDetails: { select: { id: true, amount: true, paymentDate: true } },
    },
  });
  if (!q) throw new NotFoundError(`Tour query ${tourPackageQueryId} not found`);
  return q;
}

async function confirmTourQuery(rawParams: unknown) {
  const { tourPackageQueryId, confirmedVariantId } = ConfirmTourQuerySchema.parse(rawParams);
  const q = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: { id: true, inquiryId: true },
  });
  if (!q) throw new NotFoundError(`Tour query ${tourPackageQueryId} not found`);

  // Use a provided variantId or generate a placeholder
  const variantId = confirmedVariantId || "confirmed-via-mcp";

  const updated = await prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data: { confirmedVariantId: variantId, isFeatured: true },
    select: { id: true, tourPackageQueryNumber: true, customerName: true, confirmedVariantId: true },
  });

  // If linked to inquiry, update inquiry status
  if (q.inquiryId) {
    await prismadb.inquiry.update({
      where: { id: q.inquiryId },
      data: { status: "CONFIRMED" },
    }).catch(() => {}); // Don't fail if inquiry update fails
  }

  return updated;
}

async function getQueryFinancialSummary(rawParams: unknown) {
  const { tourPackageQueryId } = GetQueryFinancialSummarySchema.parse(rawParams);

  const [sales, purchases, receipts, payments, expenses, incomes] = await Promise.all([
    prismadb.saleDetail.findMany({
      where: { tourPackageQueryId },
      select: { salePrice: true, gstAmount: true },
    }),
    prismadb.purchaseDetail.findMany({
      where: { tourPackageQueryId },
      select: { price: true, gstAmount: true, netPayable: true },
    }),
    prismadb.receiptDetail.findMany({
      where: { tourPackageQueryId },
      select: { amount: true },
    }),
    prismadb.paymentDetail.findMany({
      where: { tourPackageQueryId },
      select: { amount: true },
    }),
    prismadb.expenseDetail.findMany({
      where: { tourPackageQueryId },
      select: { amount: true },
    }),
    prismadb.incomeDetail.findMany({
      where: { tourPackageQueryId },
      select: { amount: true },
    }),
  ]);

  const totalSales = sales.reduce((s, r) => s + r.salePrice + (r.gstAmount ?? 0), 0);
  const totalPurchases = purchases.reduce((s, r) => s + (r.netPayable ?? r.price + (r.gstAmount ?? 0)), 0);
  const totalReceipts = receipts.reduce((s, r) => s + r.amount, 0);
  const totalPayments = payments.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const totalIncomes = incomes.reduce((s, r) => s + r.amount, 0);

  return {
    tourPackageQueryId,
    revenue: { sales: totalSales, incomes: totalIncomes, total: totalSales + totalIncomes },
    costs: { purchases: totalPurchases, expenses: totalExpenses, total: totalPurchases + totalExpenses },
    grossProfit: totalSales + totalIncomes - totalPurchases - totalExpenses,
    collections: { receipts: totalReceipts, payments: totalPayments },
    outstanding: {
      receivable: totalSales - totalReceipts,
      payable: totalPurchases - totalPayments,
    },
  };
}

async function updateTourQuery(rawParams: unknown) {
  const { tourPackageQueryId, tourStartsFrom, tourEndsOn, ...rest } = UpdateTourQuerySchema.parse(rawParams);
  const data: Record<string, unknown> = { ...rest };
  if (tourStartsFrom) { const d = dateToUtc(tourStartsFrom); if (d) data.tourStartsFrom = d; }
  if (tourEndsOn) { const d = dateToUtc(tourEndsOn); if (d) data.tourEndsOn = d; }
  return prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data,
    select: { id: true, tourPackageQueryNumber: true, customerName: true, updatedAt: true },
  });
}

async function archiveTourQuery(rawParams: unknown) {
  const { tourPackageQueryId } = ArchiveTourQuerySchema.parse(rawParams);
  return prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data: { isArchived: true },
    select: { id: true, tourPackageQueryNumber: true, isArchived: true },
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export const tourQueryHandlers: ToolHandlerMap = {
  create_tour_query: createTourQuery,
  list_tour_queries: listTourQueries,
  get_tour_query: getTourQuery,
  confirm_tour_query: confirmTourQuery,
  get_query_financial_summary: getQueryFinancialSummary,
  update_tour_query: updateTourQuery,
  archive_tour_query: archiveTourQuery,
};
