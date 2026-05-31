import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { calculatePricing, derivePerPersonRates } from "@/lib/pricing-calculator";

export const dynamic = "force-dynamic";

const pricingText = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => (value == null ? "" : String(value)))
  .optional();

const pricingComponentSchema = z
  .object({
    name: pricingText,
    price: pricingText,
    description: pricingText,
    derivationFormula: pricingText,
  })
  .passthrough();

const patchSchema = z.object({
  calculationMethod: z.string().max(80).optional().nullable(),
  components: z.array(pricingComponentSchema).optional(),
  totalCost: z.coerce.number().min(0).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  appliedMarkup: z
    .object({
      percentage: z.coerce.number().optional(),
      amount: z.coerce.number().optional(),
    })
    .optional(),
  breakdown: z
    .object({
      accommodation: z.coerce.number().optional(),
      transport: z.coerce.number().optional(),
    })
    .optional(),
  itineraryBreakdown: z.unknown().optional(),
  transportDetails: z.unknown().optional(),
  perPersonRates: z.unknown().optional(),
  remarks: z.string().max(5000).optional().nullable(),
});

const calculateSchema = z.object({
  markup: z.coerce.number().min(0).max(1000).optional().default(0),
});

function asRecord(value: unknown): Record<string, any> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function normalizeComponents(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> =>
      item != null && typeof item === "object" && !Array.isArray(item)
    )
    .map((item) => ({
      ...item,
      name: item.name == null ? "" : String(item.name),
      price: item.price == null ? "" : String(item.price),
      description: item.description == null ? "" : String(item.description),
    }));
}

function toAmount(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pricingTotal(components: { price?: string }[]): number {
  return components.reduce((sum, item) => sum + toAmount(item.price), 0);
}

function findNestedRecord(
  value: unknown,
  keys: Array<string | null | undefined>
): Record<string, any> {
  const source = asRecord(value);
  for (const key of keys) {
    if (!key) continue;
    const candidate = source[key];
    if (candidate != null && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, any>;
    }
  }
  return {};
}

function normalizePricing(pricing: Record<string, any> | null) {
  if (!pricing) return null;
  return {
    calculationMethod:
      typeof pricing.calculationMethod === "string" ? pricing.calculationMethod : null,
    components: normalizeComponents(pricing.components),
    remarks: typeof pricing.remarks === "string" ? pricing.remarks : null,
    totalCost: Number(pricing.totalCost ?? 0),
    basePrice: Number(pricing.basePrice ?? 0),
    markupPercentage: Number(pricing.appliedMarkup?.percentage ?? 0),
    markupAmount: Number(pricing.appliedMarkup?.amount ?? 0),
    accommodation: Number(pricing.breakdown?.accommodation ?? 0),
    transport: Number(pricing.breakdown?.transport ?? 0),
    itineraryBreakdown: pricing.itineraryBreakdown ?? null,
    transportDetails: pricing.transportDetails ?? null,
    perPersonRates: pricing.perPersonRates ?? null,
    calculatedAt: pricing.calculatedAt ?? null,
  };
}

function dayLabel(days: number[]): string {
  return days.length === 1 ? `day ${days[0]}` : `days ${days.join(", ")}`;
}

async function loadQuery(id: string) {
  return prismadb.tourPackageQuery.findUnique({
    where: { id },
    select: {
      id: true,
      tourStartsFrom: true,
      tourEndsOn: true,
      variantPricingData: true,
      variantRoomAllocations: true,
      variantTransportDetails: true,
      variantHotelOverrides: true,
      associatePartnerId: true,
      inquiry: { select: { associatePartnerId: true } },
      queryVariantSnapshots: {
        select: {
          id: true,
          sourceVariantId: true,
          name: true,
          sortOrder: true,
          hotelSnapshots: {
            select: { dayNumber: true, hotelId: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      itineraries: {
        select: {
          id: true,
          dayNumber: true,
          locationId: true,
          hotelId: true,
        },
        orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
      },
    },
  });
}

type LoadedQuery = NonNullable<Awaited<ReturnType<typeof loadQuery>>>;

function findVariant(
  snapshots: LoadedQuery["queryVariantSnapshots"],
  variantId: string
) {
  return snapshots.find(
    (variant) => variant.id === variantId || variant.sourceVariantId === variantId
  );
}

function pricingKeyFor(variant: { id: string; sourceVariantId: string | null }) {
  return variant.sourceVariantId || variant.id;
}

function responseFor(
  queryId: string,
  variant: { id: string; sourceVariantId: string | null; name: string; sortOrder: number | null },
  pricing: Record<string, any> | null
) {
  return {
    tourPackageQueryId: queryId,
    variant: {
      id: variant.id,
      sourceVariantId: variant.sourceVariantId,
      name: variant.name,
      sortOrder: variant.sortOrder,
    },
    pricing: normalizePricing(pricing),
  };
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const variantId = params.variantId?.trim();
    if (!id || !variantId) return new NextResponse("Missing id", { status: 400 });

    const tpq = await loadQuery(id);
    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const variant = findVariant(tpq.queryVariantSnapshots, variantId);
    if (!variant) return new NextResponse("Variant not found", { status: 404 });

    const pricingMap = asRecord(tpq.variantPricingData);
    const key = pricingKeyFor(variant);
    const pricing = asRecord(pricingMap[key] ?? pricingMap[variant.id] ?? null);

    return NextResponse.json(responseFor(tpq.id, variant, Object.keys(pricing).length ? pricing : null));
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_PRICING_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const variantId = params.variantId?.trim();
    if (!id || !variantId) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await loadQuery(id);
    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const variant = findVariant(tpq.queryVariantSnapshots, variantId);
    if (!variant) return new NextResponse("Variant not found", { status: 404 });

    const pricingMap = asRecord(tpq.variantPricingData);
    const key = pricingKeyFor(variant);
    const existing = asRecord(pricingMap[key] ?? pricingMap[variant.id]);
    const components = parsed.data.components
      ? normalizeComponents(parsed.data.components)
      : normalizeComponents(existing.components);
    const totalCost =
      parsed.data.totalCost ?? Number(existing.totalCost ?? pricingTotal(components));
    const calculationMethod =
      parsed.data.calculationMethod || existing.calculationMethod || "manual";

    const updatedPricing = {
      ...existing,
      calculationMethod,
      components,
      totalCost,
      basePrice: parsed.data.basePrice ?? existing.basePrice ?? totalCost,
      appliedMarkup:
        parsed.data.appliedMarkup ??
        existing.appliedMarkup ?? { percentage: 0, amount: 0 },
      breakdown:
        parsed.data.breakdown ??
        existing.breakdown ?? { accommodation: 0, transport: 0 },
      remarks:
        parsed.data.remarks !== undefined
          ? parsed.data.remarks || ""
          : existing.remarks || "",
      calculatedAt: new Date().toISOString(),
      ...(parsed.data.itineraryBreakdown !== undefined
        ? { itineraryBreakdown: parsed.data.itineraryBreakdown }
        : {}),
      ...(parsed.data.transportDetails !== undefined
        ? { transportDetails: parsed.data.transportDetails }
        : {}),
      ...(parsed.data.perPersonRates !== undefined
        ? { perPersonRates: parsed.data.perPersonRates }
        : {}),
    };

    const nextPricingMap = {
      ...pricingMap,
      [key]: updatedPricing,
    };

    await prismadb.tourPackageQuery.update({
      where: { id: tpq.id },
      data: { variantPricingData: nextPricingMap },
    });

    return NextResponse.json(responseFor(tpq.id, variant, updatedPricing));
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_PRICING_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const variantId = params.variantId?.trim();
    if (!id || !variantId) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = calculateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await loadQuery(id);
    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!tpq.tourStartsFrom || !tpq.tourEndsOn) {
      return NextResponse.json(
        { error: "Travel start and end dates are required for calculation." },
        { status: 422 }
      );
    }

    const variant = findVariant(tpq.queryVariantSnapshots, variantId);
    if (!variant) return new NextResponse("Variant not found", { status: 404 });

    const key = pricingKeyFor(variant);
    const variantKeys = [key, variant.id, variant.sourceVariantId, variantId];
    const roomsByItinerary = findNestedRecord(tpq.variantRoomAllocations, variantKeys);
    const transportsByItinerary = findNestedRecord(tpq.variantTransportDetails, variantKeys);
    const hotelOverrides = findNestedRecord(tpq.variantHotelOverrides, variantKeys);
    const hotelsByDay = new Map(
      variant.hotelSnapshots.map((snapshot) => [snapshot.dayNumber, snapshot.hotelId])
    );

    const pricingItineraries = tpq.itineraries.map((itinerary, index) => {
      const dayNumber = itinerary.dayNumber ?? index + 1;
      return {
        locationId: itinerary.locationId,
        dayNumber,
        hotelId:
          hotelOverrides[itinerary.id] ||
          hotelsByDay.get(dayNumber) ||
          itinerary.hotelId ||
          undefined,
        roomAllocations: Array.isArray(roomsByItinerary[itinerary.id])
          ? roomsByItinerary[itinerary.id]
          : [],
        transportDetails: Array.isArray(transportsByItinerary[itinerary.id])
          ? transportsByItinerary[itinerary.id]
          : [],
      };
    });

    const hasInputs = pricingItineraries.some(
      (itinerary) =>
        itinerary.roomAllocations.length > 0 || itinerary.transportDetails.length > 0
    );
    if (!hasInputs) {
      return NextResponse.json(
        { error: "Add variant rooms or transport before calculating pricing." },
        { status: 422 }
      );
    }

    const incompleteRoomDays = pricingItineraries
      .filter((itinerary) =>
        itinerary.roomAllocations.some(
          (room: any) => !room.roomTypeId || !room.occupancyTypeId || !room.mealPlanId
        )
      )
      .map((itinerary) => itinerary.dayNumber);
    if (incompleteRoomDays.length > 0) {
      return NextResponse.json(
        {
          error: `Complete room type, occupancy, and meal plan for ${dayLabel(
            incompleteRoomDays
          )}.`,
        },
        { status: 422 }
      );
    }

    const result = await calculatePricing({
      tourStartsFrom: tpq.tourStartsFrom,
      tourEndsOn: tpq.tourEndsOn,
      itineraries: pricingItineraries,
      markup: parsed.data.markup,
      includeNames: true,
    });

    let perPersonRates: unknown = undefined;
    try {
      perPersonRates = await derivePerPersonRates({
        calculationResult: result,
        itineraries: pricingItineraries,
        tourStartsFrom: tpq.tourStartsFrom,
        tourEndsOn: tpq.tourEndsOn,
      });
    } catch {
      perPersonRates = undefined;
    }

    const pricingSection = [
      {
        name: "Total Cost",
        price: String(result.totalCost || 0),
        description: `Base ${result.basePrice.toFixed(0)} + markup ${result.appliedMarkup.amount.toFixed(0)}`,
      },
      {
        name: "Accommodation",
        price: String(result.breakdown.accommodation || 0),
        description: "Hotel room costs",
      },
      {
        name: "Transport",
        price: String(result.breakdown.transport || 0),
        description: "Vehicle costs",
      },
    ].filter((item) => Number(item.price) > 0 || item.name === "Total Cost");

    return NextResponse.json({
      ...result,
      perPersonRates,
      pricingSection,
      calculationMethod: "autoHotelTransport",
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_PRICING_CALCULATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
