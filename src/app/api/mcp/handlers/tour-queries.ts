import prismadb from "@/lib/prismadb";
import { z } from "zod";
import { dateToUtc } from "@/lib/timezone-utils";
import { McpError, NotFoundError } from "../lib/errors";
import { isoDateString, type ToolHandlerMap } from "../lib/schemas";
import { createVariantSnapshots } from "@/lib/variant-snapshot";

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
  tourPackageId: z.string().optional(),
  selectedVariantIds: z.array(z.string()).optional().default([]),
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

type TourQueryCreateDependencies = {
  prismadb: typeof prismadb;
  dateToUtc: typeof dateToUtc;
  createVariantSnapshots: typeof createVariantSnapshots;
};

const defaultTourQueryCreateDependencies: TourQueryCreateDependencies = {
  prismadb,
  dateToUtc,
  createVariantSnapshots,
};

function createRollbackError(message: string, code = "VALIDATION_ERROR") {
  return new McpError(message, code, 422);
}

async function rollbackTourQueryIfNeeded(deps: TourQueryCreateDependencies, queryId: string) {
  try {
    await deps.prismadb.tourPackageQuery.delete({ where: { id: queryId } });
  } catch (rollbackError) {
    console.error("[MCP] Failed to roll back partially created tour query", rollbackError);
  }
}

async function resolveTourPackageTemplate(
  deps: TourQueryCreateDependencies,
  tourPackageId: string | undefined
): Promise<{ selectedTemplateId: string | null; selectedTemplateType: string | null; tourPackageTemplateName: string | null }> {
  if (!tourPackageId) {
    return {
      selectedTemplateId: null,
      selectedTemplateType: null,
      tourPackageTemplateName: null,
    };
  }

  const pkg = await deps.prismadb.tourPackage.findUnique({
    where: { id: tourPackageId },
    select: { id: true, tourPackageName: true },
  });

  if (!pkg) {
    throw new NotFoundError(
      `Tour package "${tourPackageId}" not found. Use list_tour_packages to find a valid package ID.`,
      "TOUR_PACKAGE_NOT_FOUND"
    );
  }

  return {
    selectedTemplateId: pkg.id,
    selectedTemplateType: "tourPackage",
    tourPackageTemplateName: pkg.tourPackageName ?? null,
  };
}

async function validateSelectedVariantIds(
  deps: TourQueryCreateDependencies,
  tourPackageId: string | null,
  selectedVariantIds: string[]
): Promise<string[]> {
  const uniqueVariantIds = Array.from(
    new Set(
      selectedVariantIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );

  if (uniqueVariantIds.length === 0) {
    return [];
  }

  if (!tourPackageId) {
    throw createRollbackError("tourPackageId is required when selectedVariantIds are provided");
  }

  const variants = await deps.prismadb.packageVariant.findMany({
    where: {
      id: { in: uniqueVariantIds },
      tourPackageId,
    },
    select: { id: true },
  });

  if (variants.length !== uniqueVariantIds.length) {
    const foundIds = new Set(variants.map((variant) => variant.id));
    const missingIds = uniqueVariantIds.filter((id) => !foundIds.has(id));
    throw new NotFoundError(
      `Variant ID(s) ${missingIds.join(", ")} do not belong to tour package "${tourPackageId}". Use get_tour_package to select valid variants.`,
      "VARIANT_NOT_FOUND"
    );
  }

  return uniqueVariantIds;
}

export async function createTourQueryWithDependencies(
  deps: TourQueryCreateDependencies,
  rawParams: unknown
) {
  const params = CreateTourQuerySchema.parse(rawParams);

  // Mutable working copies of params fields that may be enriched below
  let itineraries = [...params.itineraries];
  let numAdults = params.numAdults;
  let numChild5to12 = params.numChild5to12;
  let numChild0to5 = params.numChild0to5;
  let tourPackageQueryName = params.tourPackageQueryName;
  let numDaysNight = params.numDaysNight;
  let inclusions = params.inclusions;
  let exclusions = params.exclusions;
  let importantNotes = params.importantNotes;
  let paymentPolicy = params.paymentPolicy;
  let usefulTip = params.usefulTip;
  let cancellationPolicy = params.cancellationPolicy;
  let airlineCancellationPolicy = params.airlineCancellationPolicy;
  let termsconditions = params.termsconditions;
  let kitchenGroupPolicy = params.kitchenGroupPolicy;

  let locationId = params.locationId;
  if (!locationId && params.locationName) {
    const loc = await deps.prismadb.location.findFirst({
      where: { isActive: true, label: { contains: params.locationName } },
    });
    if (!loc) {
      throw new NotFoundError(
        `Location "${params.locationName}" not found. Call search_locations first to find the correct name.`,
        "LOCATION_NOT_FOUND"
      );
    }
    locationId = loc.id;
  }

  const resolvedLocationId = locationId!;
  const template = await resolveTourPackageTemplate(deps, params.tourPackageId ?? undefined);
  const normalizedSelectedVariantIds = await validateSelectedVariantIds(
    deps,
    template.selectedTemplateId,
    params.selectedVariantIds
  );

  // ── Auto-derive itineraries from tour package when none are provided ─────────
  if (params.tourPackageId && itineraries.length === 0) {
    const pkg = await deps.prismadb.tourPackage.findUnique({
      where: { id: params.tourPackageId },
      select: {
        tourPackageName: true,
        numDaysNight: true,
        inclusions: true,
        exclusions: true,
        importantNotes: true,
        paymentPolicy: true,
        usefulTip: true,
        cancellationPolicy: true,
        airlineCancellationPolicy: true,
        termsconditions: true,
        kitchenGroupPolicy: true,
        itineraries: {
          select: {
            dayNumber: true,
            itineraryTitle: true,
            itineraryDescription: true,
            hotelId: true,
            mealPlanId: true,
            locationId: true,
            activities: {
              select: { activityTitle: true, activityDescription: true },
            },
          },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (pkg && pkg.itineraries.length > 0) {
      itineraries = (pkg.itineraries as any[])
        .filter((it: any) => it.dayNumber !== null)
        .map((it: any) => ({
          dayNumber: it.dayNumber as number,
          itineraryTitle: (it.itineraryTitle as string | null) ?? `Day ${it.dayNumber}`,
          itineraryDescription: (it.itineraryDescription as string | null) ?? undefined,
          hotelId: (it.hotelId as string | null) ?? undefined,
          mealPlanId: (it.mealPlanId as string | null) ?? undefined,
          locationId: (it.locationId as string | null) ?? undefined,
          activities: ((it.activities ?? []) as any[]).map((a: any) => ({
            activityTitle: (a.activityTitle as string | null) ?? "",
            activityDescription: (a.activityDescription as string | null) ?? undefined,
          })).filter((a: any) => a.activityTitle),
          roomAllocations: [] as z.infer<typeof RoomAllocationInputSchema>[],
        }));
    }

    // Copy package policy fields as fallbacks (only if not explicitly provided)
    if (!tourPackageQueryName && pkg?.tourPackageName) tourPackageQueryName = pkg.tourPackageName;
    if (!numDaysNight && pkg?.numDaysNight) numDaysNight = pkg.numDaysNight;
    if (!inclusions && pkg?.inclusions) inclusions = pkg.inclusions as string[];
    if (!exclusions && pkg?.exclusions) exclusions = pkg.exclusions as string[];
    if (!importantNotes && pkg?.importantNotes) importantNotes = pkg.importantNotes as string[];
    if (!paymentPolicy && pkg?.paymentPolicy) paymentPolicy = pkg.paymentPolicy as string[];
    if (!usefulTip && pkg?.usefulTip) usefulTip = pkg.usefulTip as string[];
    if (!cancellationPolicy && pkg?.cancellationPolicy) cancellationPolicy = pkg.cancellationPolicy as string[];
    if (!airlineCancellationPolicy && pkg?.airlineCancellationPolicy) airlineCancellationPolicy = pkg.airlineCancellationPolicy as string[];
    if (!termsconditions && pkg?.termsconditions) termsconditions = pkg.termsconditions as string[];
    if (!kitchenGroupPolicy && pkg?.kitchenGroupPolicy) kitchenGroupPolicy = pkg.kitchenGroupPolicy as string[];
  }

  // ── Auto-populate from inquiry when inquiryId is provided ───────────────────
  if (params.inquiryId) {
    const inquiry = await deps.prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      select: {
        numAdults: true,
        numChildrenAbove11: true,
        numChildren5to11: true,
        numChildrenBelow5: true,
        roomAllocations: {
          select: {
            roomTypeId: true,
            occupancyTypeId: true,
            mealPlanId: true,
            quantity: true,
            guestNames: true,
          },
        },
      },
    });

    if (inquiry) {
      // Apply guest counts from inquiry if not already set
      if (!numAdults && inquiry.numAdults) numAdults = String(inquiry.numAdults);
      if (!numChild5to12 && inquiry.numChildren5to11) numChild5to12 = String(inquiry.numChildren5to11);
      if (!numChild0to5 && inquiry.numChildrenBelow5) numChild0to5 = String(inquiry.numChildrenBelow5);

      // Apply inquiry room allocations to each itinerary day that has no room allocations
      if (inquiry.roomAllocations.length > 0) {
        const inquiryRoomAllocations = (inquiry.roomAllocations as any[]).map((ra: any) => ({
          roomTypeId: (ra.roomTypeId as string | null) ?? undefined,
          occupancyTypeId: ra.occupancyTypeId as string,
          mealPlanId: (ra.mealPlanId as string | null) ?? undefined,
          quantity: ra.quantity as number,
          guestNames: (ra.guestNames as string | null) ?? undefined,
        }));
        itineraries = itineraries.map(it => ({
          ...it,
          roomAllocations: (it.roomAllocations && it.roomAllocations.length > 0)
            ? it.roomAllocations
            : inquiryRoomAllocations,
        }));
      }
    }
  }

  // ── Final validation: must have at least one itinerary ──────────────────────
  if (itineraries.length === 0) {
    throw createRollbackError(
      "At least one itinerary is required. Provide itineraries manually, or pass a tourPackageId to auto-derive them from the package."
    );
  }

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const queryNumber = `TPQ-${datePart}-${Date.now()}-${randomSuffix}`;

  const tourStartsFrom = params.tourStartsFrom ? deps.dateToUtc(params.tourStartsFrom) ?? null : null;
  const tourEndsOn = params.tourEndsOn ? deps.dateToUtc(params.tourEndsOn) ?? null : null;

  const query = await deps.prismadb.tourPackageQuery.create({
    data: {
      tourPackageQueryNumber: queryNumber,
      tourPackageQueryName: tourPackageQueryName ?? null,
      customerName: params.customerName,
      customerNumber: params.customerNumber ?? null,
      locationId: resolvedLocationId,
      tourCategory: (params.tourCategory as any) ?? "Domestic",
      tourPackageQueryType: params.tourPackageQueryType ?? null,
      numDaysNight: numDaysNight ?? null,
      numAdults: numAdults ?? null,
      numChild5to12: numChild5to12 ?? null,
      numChild0to5: numChild0to5 ?? null,
      tourStartsFrom,
      tourEndsOn,
      transport: params.transport ?? null,
      pickup_location: params.pickup_location ?? null,
      drop_location: params.drop_location ?? null,
      remarks: params.remarks ?? null,
      inquiryId: params.inquiryId ?? null,
      selectedTemplateId: template.selectedTemplateId,
      selectedTemplateType: template.selectedTemplateType,
      tourPackageTemplateName: template.tourPackageTemplateName,
      price: params.price ?? null,
      totalPrice: params.totalPrice ?? null,
      inclusions: inclusions ?? null,
      exclusions: exclusions ?? null,
      importantNotes: importantNotes ?? null,
      paymentPolicy: paymentPolicy ?? null,
      usefulTip: usefulTip ?? null,
      cancellationPolicy: cancellationPolicy ?? null,
      airlineCancellationPolicy: airlineCancellationPolicy ?? null,
      termsconditions: termsconditions ?? null,
      kitchenGroupPolicy: kitchenGroupPolicy ?? null,
      isFeatured: false,
      isArchived: false,
    } as any,
  });

  try {
    await createItinerariesForQuery(deps, query.id, resolvedLocationId, itineraries);
  } catch (error) {
    await rollbackTourQueryIfNeeded(deps, query.id);
    throw error;
  }

  if (normalizedSelectedVariantIds.length > 0) {
    try {
      await deps.prismadb.tourPackageQuery.update({
        where: { id: query.id },
        data: { selectedVariantIds: normalizedSelectedVariantIds },
      });

      await deps.createVariantSnapshots(query.id, normalizedSelectedVariantIds, {
        overwrite: true,
        tourPackageId: template.selectedTemplateId ?? undefined,
      });
    } catch (error) {
      await rollbackTourQueryIfNeeded(deps, query.id);
      throw error;
    }
  }

  return deps.prismadb.tourPackageQuery.findUnique({
    where: { id: query.id },
    include: fullQueryInclude,
  });
}

// ── Lookup resolution helper ──────────────────────────────────────────────────

interface LookupMaps {
  hotelNameToIdMap: Map<string, string>;
  roomTypeNameToIdMap: Map<string, string>;
  occupancyTypeNameToIdMap: Map<string, string>;
  mealPlanNameToIdMap: Map<string, string>;
  customRoomTypeId: string | null;
}

async function resolveItineraryLookups(
  deps: TourQueryCreateDependencies,
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
      ? deps.prismadb.hotel.findMany({
          where: { locationId: fallbackLocationId, name: { in: hotelNames } },
          select: { id: true, name: true },
        })
      : [],
    roomTypeNames.length > 0
      ? deps.prismadb.roomType.findMany({
          where: { name: { in: roomTypeNames } },
          select: { id: true, name: true },
        })
      : [],
    occupancyTypeNames.length > 0
      ? deps.prismadb.occupancyType.findMany({
          where: { name: { in: occupancyTypeNames } },
          select: { id: true, name: true },
        })
      : [],
    mealPlanNames.length > 0
      ? deps.prismadb.mealPlan.findMany({
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
    let placeholder = await deps.prismadb.roomType.findUnique({ where: { name: "Custom" } });
    if (!placeholder) {
      placeholder = await deps.prismadb.roomType.create({
        data: { name: "Custom", description: "Custom ad-hoc room type placeholder", isActive: true },
      });
    }
    customRoomTypeId = placeholder.id;
  }

  return { hotelNameToIdMap, roomTypeNameToIdMap, occupancyTypeNameToIdMap, mealPlanNameToIdMap, customRoomTypeId };
}

// ── Itinerary creation helper ─────────────────────────────────────────────────

async function createItinerariesForQuery(
  deps: TourQueryCreateDependencies,
  queryId: string,
  fallbackLocationId: string,
  itineraries: z.infer<typeof ItineraryInputSchema>[]
): Promise<void> {
  if (itineraries.length === 0) return;

  const maps = await resolveItineraryLookups(deps, itineraries, fallbackLocationId);

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

    const createdItinerary = await deps.prismadb.itinerary.create({
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
          deps.prismadb.activity.create({
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

          return deps.prismadb.roomAllocation.create({
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
  queryVariantSnapshots: {
    include: {
      hotelSnapshots: { orderBy: { dayNumber: "asc" as const } },
      pricingSnapshots: {
        include: { pricingComponentSnapshots: true },
      },
    },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

// ── Handlers ─────────────────────────────────────────────────────────────────

async function createTourQuery(rawParams: unknown) {
  const created = await createTourQueryWithDependencies(defaultTourQueryCreateDependencies, rawParams);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { ...created, pdfGeneratorUrl: `${baseUrl}/tourPackageQueryPDFGenerator/${created!.id}` };
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return result.map((r) => ({ ...r, pdfGeneratorUrl: `${baseUrl}/tourPackageQueryPDFGenerator/${r.id}` }));
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
          itineraryImages: { select: { id: true, url: true } },
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { ...q, pdfGeneratorUrl: `${baseUrl}/tourPackageQueryPDFGenerator/${q.id}` };
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
      await createItinerariesForQuery({ prismadb, dateToUtc, createVariantSnapshots }, tourPackageQueryId, existing.locationId, itineraries);
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

// ── Variant schemas ───────────────────────────────────────────────────────────

const VariantComponentSchema = z.object({
  name: z.string().min(1),
  price: z.number(),
  description: z.string().optional(),
});

const VariantInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  totalPrice: z.number().optional(),
  pricingComponents: z.array(VariantComponentSchema).optional().default([]),
  hotelOverrides: z.array(z.object({
    dayNumber: z.number().int().min(1),
    hotelName: z.string().min(1),
  })).optional().default([]),
  remarks: z.string().optional(),
});

const AddTourQueryVariantSchema = z.object({
  tourPackageQueryId: z.string().min(1),
  variants: z.array(VariantInputSchema).min(1),
  replaceExisting: z.boolean().optional().default(false),
});

// ── addTourQueryVariant ───────────────────────────────────────────────────────

async function addTourQueryVariant(rawParams: unknown) {
  const { tourPackageQueryId, variants, replaceExisting } = AddTourQueryVariantSchema.parse(rawParams);

  // Fetch existing query with itineraries and current variant JSON fields
  const query = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    select: {
      id: true,
      locationId: true,
      customQueryVariants: true,
      variantHotelOverrides: true,
      variantPricingData: true,
      itineraries: { select: { id: true, dayNumber: true }, orderBy: { dayNumber: "asc" } },
    },
  });
  if (!query) throw new NotFoundError(`Tour query ${tourPackageQueryId} not found`);

  // Build dayNumber → itineraryId map
  const dayToItineraryId = new Map<number, string>();
  for (const itin of query.itineraries) {
    if (itin.dayNumber != null) dayToItineraryId.set(itin.dayNumber, itin.id);
  }

  // Seed existing data or start fresh
  const existingCustomVariants: any[] = replaceExisting ? [] : (Array.isArray(query.customQueryVariants) ? query.customQueryVariants as any[] : []);
  const existingHotelOverrides: Record<string, Record<string, string>> = replaceExisting ? {} : ((query.variantHotelOverrides as any) ?? {});
  const existingPricingData: Record<string, any> = replaceExisting ? {} : ((query.variantPricingData as any) ?? {});

  for (const variant of variants) {
    const variantId = crypto.randomUUID();

    // Build hotel overrides for this variant: { itineraryId: hotelId }
    const hotelOverridesForVariant: Record<string, string> = {};
    for (const override of variant.hotelOverrides ?? []) {
      const itineraryId = dayToItineraryId.get(override.dayNumber);
      if (!itineraryId) continue;
      // Resolve hotel name → ID
      const hotel = await prismadb.hotel.findFirst({
        where: { name: { contains: override.hotelName }, locationId: query.locationId },
        select: { id: true },
      });
      if (hotel) hotelOverridesForVariant[itineraryId] = hotel.id;
    }

    // Build the customQueryVariant object
    const customVariant = {
      id: variantId,
      name: variant.name,
      description: variant.description ?? null,
      totalPrice: variant.totalPrice?.toString() ?? null,
      remarks: variant.remarks ?? null,
      pricingData: {
        calculationMethod: "manual",
        components: (variant.pricingComponents ?? []).map((c) => ({ name: c.name, price: c.price, description: c.description ?? null })),
        totalCost: variant.totalPrice ?? (variant.pricingComponents ?? []).reduce((sum, c) => sum + c.price, 0),
        calculatedAt: new Date().toISOString(),
      },
    };

    existingCustomVariants.push(customVariant);

    if (Object.keys(hotelOverridesForVariant).length > 0) {
      existingHotelOverrides[variantId] = hotelOverridesForVariant;
    }

    existingPricingData[variantId] = {
      components: (variant.pricingComponents ?? []).map((c) => ({ name: c.name, price: c.price.toString() })),
      totalCost: variant.totalPrice ?? (variant.pricingComponents ?? []).reduce((sum, c) => sum + c.price, 0),
    };
  }

  await prismadb.tourPackageQuery.update({
    where: { id: tourPackageQueryId },
    data: {
      customQueryVariants: existingCustomVariants,
      variantHotelOverrides: existingHotelOverrides,
      variantPricingData: existingPricingData,
    },
  });

  const updated = await prismadb.tourPackageQuery.findUnique({
    where: { id: tourPackageQueryId },
    include: fullQueryInclude,
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return { ...updated, pdfGeneratorUrl: `${baseUrl}/tourPackageQueryPDFGenerator/${tourPackageQueryId}` };
}

// ── getTourQueryPdf ───────────────────────────────────────────────────────────

async function getTourQueryPdf(rawParams: unknown) {
  const { tourPackageQueryId } = z.object({ tourPackageQueryId: z.string().min(1) }).parse(rawParams);
  const env = (globalThis as any).process?.env as Record<string, string | undefined> | undefined ?? {};
  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const pdfUrl = `${baseUrl}/api/mcp/tour-query-pdf/${tourPackageQueryId}`;

  const response = await fetch(pdfUrl, {
    headers: { "x-mcp-api-secret": env.MCP_API_SECRET ?? "" },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new McpError(
      `PDF generation failed (${response.status}): ${errText}`,
      "PDF_ERROR",
      500
    );
  }

  const pdfBuffer = await response.arrayBuffer();
  // Buffer is available in Node.js / Next.js API routes at runtime
  const NodeBuffer = (globalThis as any).Buffer as { from: (data: ArrayBuffer) => { toString: (enc: string) => string } };
  const pdfBase64 = NodeBuffer.from(pdfBuffer).toString("base64");
  return {
    tourPackageQueryId,
    pdfBase64,
    contentType: "application/pdf",
    downloadUrl: `${baseUrl}/tourPackageQueryPDFGenerator/${tourPackageQueryId}`,
  };
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
  add_tour_query_variant: addTourQueryVariant,
  get_tour_query_pdf: getTourQueryPdf,
};
