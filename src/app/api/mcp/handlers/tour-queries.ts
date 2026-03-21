import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";

// ── Sub-schemas for itinerary building ────────────────────────────────────────

const ActivityInputSchema = z.object({
  activityTitle: z.string().min(1),
  activityDescription: z.string().optional(),
});

const RoomAllocationInputSchema = z.object({
  roomTypeId: z.string().optional(),
  roomTypeName: z.string().optional(),
  occupancyTypeId: z.string().optional(),
  occupancyTypeName: z.string().optional(),
  mealPlanId: z.string().optional(),
  mealPlanName: z.string().optional(),
  quantity: z.number().int().min(1).optional().default(1),
  guestNames: z.string().optional(),
});

const ItineraryInputSchema = z.object({
  dayNumber: z.number().int().min(1),
  itineraryTitle: z.string().min(1),
  itineraryDescription: z.string().optional(),
  locationId: z.string().optional(),
  hotelId: z.string().optional(),
  hotelName: z.string().optional(),
  mealPlanId: z.string().optional(),
  mealPlanName: z.string().optional(),
  activities: z.array(ActivityInputSchema).optional().default([]),
  roomAllocations: z.array(RoomAllocationInputSchema).optional().default([]),
});

const PolicyFieldSchema = z.array(z.string()).optional();

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
  // New fields
  tourPackageQueryName: z.string().optional(),
  itineraries: z.array(ItineraryInputSchema).optional().default([]),
  inclusions: PolicyFieldSchema,
  exclusions: PolicyFieldSchema,
  importantNotes: PolicyFieldSchema,
  paymentPolicy: PolicyFieldSchema,
  usefulTip: PolicyFieldSchema,
  cancellationPolicy: PolicyFieldSchema,
  airlineCancellationPolicy: PolicyFieldSchema,
  termsconditions: PolicyFieldSchema,
  kitchenGroupPolicy: PolicyFieldSchema,
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
  tourPackageQueryName: z.string().optional(),
  itineraries: z.array(ItineraryInputSchema).optional(),
  inclusions: PolicyFieldSchema,
  exclusions: PolicyFieldSchema,
  importantNotes: PolicyFieldSchema,
  paymentPolicy: PolicyFieldSchema,
  usefulTip: PolicyFieldSchema,
  cancellationPolicy: PolicyFieldSchema,
  airlineCancellationPolicy: PolicyFieldSchema,
  termsconditions: PolicyFieldSchema,
  kitchenGroupPolicy: PolicyFieldSchema,
});

const ArchiveTourQuerySchema = z.object({
  tourPackageQueryId: z.string().min(1),
});

// ── Lookup resolution helper ──────────────────────────────────────────────────

interface LookupMaps {
  hotelNameToIdMap: Map<string, string>;
  roomTypeNameToIdMap: Map<string, string>;
  occupancyTypeNameToIdMap: Map<string, string>;
  mealPlanNameToIdMap: Map<string, string>;
  customRoomTypeId: string | null;
}

async function resolveItineraryLookups(
  itineraries: z.infer<typeof ItineraryInputSchema>[],
  fallbackLocationId: string
): Promise<LookupMaps> {
  const allAllocations = itineraries.flatMap(it => it.roomAllocations ?? []);

  // Collect unique names to look up
  const hotelNames = Array.from(new Set(
    itineraries.filter(it => !it.hotelId && it.hotelName).map(it => it.hotelName!)
  ));
  const roomTypeNames = Array.from(new Set(
    allAllocations.filter(ra => !ra.roomTypeId && ra.roomTypeName).map(ra => ra.roomTypeName!)
  ));
  const occupancyTypeNames = Array.from(new Set(
    allAllocations.filter(ra => !ra.occupancyTypeId && ra.occupancyTypeName).map(ra => ra.occupancyTypeName!)
  ));
  const mealPlanNames = Array.from(new Set([
    ...itineraries.filter(it => !it.mealPlanId && it.mealPlanName).map(it => it.mealPlanName!),
    ...allAllocations.filter(ra => !ra.mealPlanId && ra.mealPlanName).map(ra => ra.mealPlanName!),
  ]));

  // Validate: every allocation must have occupancyTypeId or occupancyTypeName
  for (let i = 0; i < itineraries.length; i++) {
    for (let j = 0; j < (itineraries[i].roomAllocations ?? []).length; j++) {
      const ra = itineraries[i].roomAllocations![j];
      if (!ra.occupancyTypeId && !ra.occupancyTypeName) {
        throw new McpError(
          `Day ${itineraries[i].dayNumber}, room allocation ${j + 1}: occupancyTypeId or occupancyTypeName is required. Use list_occupancy_types to see options.`,
          "VALIDATION_ERROR",
          422
        );
      }
    }
  }

  // Parallel lookups
  const [hotels, roomTypes, occupancyTypes, mealPlans] = await Promise.all([
    hotelNames.length > 0
      ? prismadb.hotel.findMany({
          where: { locationId: fallbackLocationId, name: { in: hotelNames } },
          select: { id: true, name: true },
        })
      : [],
    roomTypeNames.length > 0
      ? prismadb.roomType.findMany({
          where: { name: { in: roomTypeNames } },
          select: { id: true, name: true },
        })
      : [],
    occupancyTypeNames.length > 0
      ? prismadb.occupancyType.findMany({
          where: { name: { in: occupancyTypeNames } },
          select: { id: true, name: true },
        })
      : [],
    mealPlanNames.length > 0
      ? prismadb.mealPlan.findMany({
          where: { name: { in: mealPlanNames } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  // Build case-insensitive maps
  const hotelNameToIdMap = new Map((hotels as { id: string; name: string }[]).map(h => [h.name.toLowerCase(), h.id]));
  const roomTypeNameToIdMap = new Map((roomTypes as { id: string; name: string }[]).map(rt => [rt.name.toLowerCase(), rt.id]));
  const occupancyTypeNameToIdMap = new Map((occupancyTypes as { id: string; name: string }[]).map(ot => [ot.name.toLowerCase(), ot.id]));
  const mealPlanNameToIdMap = new Map((mealPlans as { id: string; name: string }[]).map(mp => [mp.name.toLowerCase(), mp.id]));

  // Validate all looked-up names were found
  for (const name of hotelNames) {
    if (!hotelNameToIdMap.has(name.toLowerCase())) {
      throw new NotFoundError(
        `Hotel "${name}" not found at this destination. Use list_hotels to find available hotels.`,
        "HOTEL_NOT_FOUND"
      );
    }
  }
  for (const name of roomTypeNames) {
    if (!roomTypeNameToIdMap.has(name.toLowerCase())) {
      throw new NotFoundError(
        `Room type "${name}" not found. Use list_room_types to see available types.`,
        "ROOM_TYPE_NOT_FOUND"
      );
    }
  }
  for (const name of occupancyTypeNames) {
    if (!occupancyTypeNameToIdMap.has(name.toLowerCase())) {
      throw new NotFoundError(
        `Occupancy type "${name}" not found. Use list_occupancy_types to see available types.`,
        "OCCUPANCY_TYPE_NOT_FOUND"
      );
    }
  }
  for (const name of mealPlanNames) {
    if (!mealPlanNameToIdMap.has(name.toLowerCase())) {
      throw new NotFoundError(
        `Meal plan "${name}" not found. Use list_meal_plans to see available plans.`,
        "MEAL_PLAN_NOT_FOUND"
      );
    }
  }

  // Handle "Custom" placeholder for room allocations with neither roomTypeId nor roomTypeName
  const needsCustom = allAllocations.some(ra => !ra.roomTypeId && !ra.roomTypeName);
  let customRoomTypeId: string | null = null;
  if (needsCustom) {
    let placeholder = await prismadb.roomType.findUnique({ where: { name: "Custom" } });
    if (!placeholder) {
      placeholder = await prismadb.roomType.create({
        data: { name: "Custom", description: "Custom ad-hoc room type placeholder", isActive: true },
      });
    }
    customRoomTypeId = placeholder.id;
  }

  return { hotelNameToIdMap, roomTypeNameToIdMap, occupancyTypeNameToIdMap, mealPlanNameToIdMap, customRoomTypeId };
}

// ── Itinerary creation helper ─────────────────────────────────────────────────

async function createItinerariesForQuery(
  queryId: string,
  fallbackLocationId: string,
  itineraries: z.infer<typeof ItineraryInputSchema>[]
): Promise<void> {
  if (itineraries.length === 0) return;

  const maps = await resolveItineraryLookups(itineraries, fallbackLocationId);

  // Sequential to preserve dayNumber ordering
  for (const itin of itineraries) {
    const itinLocationId = itin.locationId ?? fallbackLocationId;

    // Resolve hotel
    const resolvedHotelId =
      itin.hotelId ??
      (itin.hotelName ? maps.hotelNameToIdMap.get(itin.hotelName.toLowerCase()) : undefined) ??
      null;

    // Resolve itinerary-level meal plan
    const resolvedItinMealPlanId =
      itin.mealPlanId ??
      (itin.mealPlanName ? maps.mealPlanNameToIdMap.get(itin.mealPlanName.toLowerCase()) : undefined) ??
      null;

    const createdItinerary = await prismadb.itinerary.create({
      data: {
        tourPackageQueryId: queryId,
        locationId: itinLocationId,
        dayNumber: itin.dayNumber,
        itineraryTitle: itin.itineraryTitle,
        itineraryDescription: itin.itineraryDescription ?? null,
        hotelId: resolvedHotelId ?? undefined,
        mealPlanId: resolvedItinMealPlanId ?? undefined,
      },
    });

    // Create activities in parallel
    if (itin.activities && itin.activities.length > 0) {
      await Promise.all(
        itin.activities.map(act =>
          prismadb.activity.create({
            data: {
              itineraryId: createdItinerary.id,
              locationId: itinLocationId,
              activityTitle: act.activityTitle,
              activityDescription: act.activityDescription ?? null,
            },
          })
        )
      );
    }

    // Create room allocations in parallel
    if (itin.roomAllocations && itin.roomAllocations.length > 0) {
      await Promise.all(
        itin.roomAllocations.map(ra => {
          const resolvedRoomTypeId =
            ra.roomTypeId ??
            (ra.roomTypeName ? maps.roomTypeNameToIdMap.get(ra.roomTypeName.toLowerCase()) : undefined) ??
            maps.customRoomTypeId!;

          const resolvedOccupancyTypeId =
            ra.occupancyTypeId ??
            (ra.occupancyTypeName ? maps.occupancyTypeNameToIdMap.get(ra.occupancyTypeName.toLowerCase()) : undefined);

          const resolvedMealPlanId =
            ra.mealPlanId ??
            (ra.mealPlanName ? maps.mealPlanNameToIdMap.get(ra.mealPlanName.toLowerCase()) : undefined) ??
            null;

          return prismadb.roomAllocation.create({
            data: {
              itineraryId: createdItinerary.id,
              roomTypeId: resolvedRoomTypeId!,
              occupancyTypeId: resolvedOccupancyTypeId!,
              mealPlanId: resolvedMealPlanId ?? undefined,
              quantity: ra.quantity ?? 1,
              guestNames: ra.guestNames ?? "",
              voucherNumber: "",
            },
          });
        })
      );
    }
  }
}

// ── Full include shape for returned queries ────────────────────────────────────

const fullQueryInclude = {
  location: { select: { id: true, label: true } },
  itineraries: {
    include: {
      activities: { select: { id: true, activityTitle: true, activityDescription: true } },
      roomAllocations: {
        include: {
          roomType: { select: { id: true, name: true } },
          occupancyType: { select: { id: true, name: true } },
          mealPlan: { select: { id: true, name: true } },
        },
      },
      hotel: { select: { id: true, name: true } },
    },
    orderBy: { dayNumber: "asc" as const },
  },
} as const;

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

  const resolvedLocationId = locationId!;

  // Generate collision-resistant query number
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const queryNumber = `TPQ-${datePart}-${Date.now()}-${randomSuffix}`;

  const tourStartsFrom = params.tourStartsFrom ? dateToUtc(params.tourStartsFrom) ?? null : null;
  const tourEndsOn = params.tourEndsOn ? dateToUtc(params.tourEndsOn) ?? null : null;

  const query = await prismadb.tourPackageQuery.create({
    data: {
      tourPackageQueryNumber: queryNumber,
      tourPackageQueryName: params.tourPackageQueryName ?? null,
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
      inclusions: params.inclusions ?? null,
      exclusions: params.exclusions ?? null,
      importantNotes: params.importantNotes ?? null,
      paymentPolicy: params.paymentPolicy ?? null,
      usefulTip: params.usefulTip ?? null,
      cancellationPolicy: params.cancellationPolicy ?? null,
      airlineCancellationPolicy: params.airlineCancellationPolicy ?? null,
      termsconditions: params.termsconditions ?? null,
      kitchenGroupPolicy: params.kitchenGroupPolicy ?? null,
      isFeatured: false,
      isArchived: false,
    } as any,
  });

  // Create itineraries if provided
  if (params.itineraries && params.itineraries.length > 0) {
    await createItinerariesForQuery(query.id, resolvedLocationId, params.itineraries);
  }

  // Return full record with itineraries
  return prismadb.tourPackageQuery.findUnique({
    where: { id: query.id },
    include: fullQueryInclude,
  });
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

  const variantId = confirmedVariantId || "confirmed-via-mcp";

  const updated = await prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data: { confirmedVariantId: variantId, isFeatured: true },
    select: { id: true, tourPackageQueryNumber: true, customerName: true, confirmedVariantId: true },
  });

  if (q.inquiryId) {
    await prismadb.inquiry.update({
      where: { id: q.inquiryId },
      data: { status: "CONFIRMED" },
    }).catch(() => {});
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
  const { tourPackageQueryId, tourStartsFrom, tourEndsOn, itineraries, ...rest } = UpdateTourQuerySchema.parse(rawParams);

  // Verify query exists and get locationId for itinerary fallback
  const existing = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: { id: true, locationId: true },
  });
  if (!existing) throw new NotFoundError(`Tour query ${tourPackageQueryId} not found`);

  const data: Record<string, unknown> = { ...rest };
  if (tourStartsFrom) { const d = dateToUtc(tourStartsFrom); if (d) data.tourStartsFrom = d; }
  if (tourEndsOn) { const d = dateToUtc(tourEndsOn); if (d) data.tourEndsOn = d; }

  await prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data,
  });

  // If itineraries provided, replace all existing
  if (itineraries !== undefined) {
    await prismadb.itinerary.deleteMany({ where: { tourPackageQueryId } });
    if (itineraries.length > 0) {
      await createItinerariesForQuery(tourPackageQueryId, existing.locationId, itineraries);
    }
  }

  return prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    include: fullQueryInclude,
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
