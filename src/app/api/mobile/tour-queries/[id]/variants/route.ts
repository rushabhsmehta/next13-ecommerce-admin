import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { parseCustomQueryVariants } from "@/app/api/mobile/lib/custom-query-variants";

export const dynamic = "force-dynamic";

type VariantPricing = {
  calculationMethod?: string;
  components?: Array<Record<string, unknown>>;
  remarks?: string;
  totalCost?: number;
  basePrice?: number;
  appliedMarkup?: { percentage?: number; amount?: number };
  breakdown?: { accommodation?: number; transport?: number };
  itineraryBreakdown?: unknown;
  transportDetails?: unknown;
  perPersonRates?: unknown;
  calculatedAt?: string;
  subtotalBeforeDiscount?: number;
  appliedDiscount?: { amount?: number } | null;
};

function normalizePricingComponents(value: unknown) {
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

function formatPricing(pricing: VariantPricing | null | undefined) {
  if (!pricing) return null;
  return {
    calculationMethod:
      typeof pricing.calculationMethod === "string" ? pricing.calculationMethod : null,
    components: normalizePricingComponents(pricing.components),
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
    subtotalBeforeDiscount:
      pricing.subtotalBeforeDiscount != null
        ? Number(pricing.subtotalBeforeDiscount)
        : null,
    appliedDiscount: pricing.appliedDiscount ?? null,
    discountAmount: Number(pricing.appliedDiscount?.amount ?? 0),
  };
}

/**
 * Variant comparison for a tour query. Returns each variant snapshot paired
 * with the server-computed pricing the web stored in `variantPricingData`
 * (keyed by variant id). Also merges customQueryVariants as synthetic items.
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        confirmedVariantId: true,
        variantPricingData: true,
        variantRoomAllocations: true,
        variantTransportDetails: true,
        variantHotelOverrides: true,
        customQueryVariants: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        itineraries: {
          select: {
            id: true,
            dayNumber: true,
            itineraryTitle: true,
            locationId: true,
            hotelId: true,
            hotel: { select: { id: true, name: true } },
          },
          orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
        },
        queryVariantSnapshots: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
            sourceVariantId: true,
            hotelSnapshots: {
              select: { dayNumber: true, hotelId: true, hotelName: true },
              orderBy: { dayNumber: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const pricingMap =
      (tpq.variantPricingData as Record<string, VariantPricing> | null) ?? {};

    const [roomTypes, occupancyTypes, mealPlans, vehicleTypes] = await Promise.all([
      prismadb.roomType.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prismadb.occupancyType.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prismadb.mealPlan.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prismadb.vehicleType.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const snapshotVariants = tpq.queryVariantSnapshots.map((snap) => {
      const pricing =
        (snap.sourceVariantId && pricingMap[snap.sourceVariantId]) ||
        pricingMap[snap.id] ||
        null;
      return {
        id: snap.id,
        name: snap.name,
        sortOrder: snap.sortOrder,
        sourceVariantId: snap.sourceVariantId,
        isCustom: false,
        isConfirmed:
          tpq.confirmedVariantId != null &&
          (tpq.confirmedVariantId === snap.id ||
            tpq.confirmedVariantId === snap.sourceVariantId),
        hotelSnapshots: snap.hotelSnapshots.map((row) => ({
          dayNumber: row.dayNumber,
          hotelId: row.hotelId,
          hotelName: row.hotelName,
        })),
        pricing: formatPricing(pricing),
      };
    });

    const customVariants = parseCustomQueryVariants(tpq.customQueryVariants).map(
      (custom) => ({
        id: custom.id,
        name: custom.name,
        sortOrder: custom.sortOrder,
        sourceVariantId: null as string | null,
        isCustom: true,
        isConfirmed: tpq.confirmedVariantId === custom.id,
        hotelSnapshots: [] as Array<{
          dayNumber: number;
          hotelId: string;
          hotelName: string;
        }>,
        pricing: formatPricing(pricingMap[custom.id] ?? null),
      })
    );

    const variants = [...snapshotVariants, ...customVariants].sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      confirmedVariantId: tpq.confirmedVariantId,
      hasPricing: Object.keys(pricingMap).length > 0,
      variants,
      build: {
        itineraries: tpq.itineraries.map((it) => ({
          id: it.id,
          dayNumber: it.dayNumber,
          itineraryTitle: it.itineraryTitle,
          locationId: it.locationId,
          hotel: it.hotel,
        })),
        variantRoomAllocations: (tpq.variantRoomAllocations as Record<string, unknown> | null) ?? {},
        variantTransportDetails:
          (tpq.variantTransportDetails as Record<string, unknown> | null) ?? {},
        variantHotelOverrides: (tpq.variantHotelOverrides as Record<string, unknown> | null) ?? {},
        lookups: {
          roomTypes,
          occupancyTypes,
          mealPlans,
          vehicleTypes,
        },
      },
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Confirm/unconfirm a specific variant on a tour package query.
 * Expects JSON body: { confirmedVariantId: string | null }
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { confirmedVariantId } = body;

    const existing = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        isFeatured: true,
        inquiryId: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        customQueryVariants: true,
        queryVariantSnapshots: {
          select: { id: true, sourceVariantId: true, name: true },
        },
      },
    });

    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, existing)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let targetVariantId: string | null = null;
    if (confirmedVariantId) {
      const matchedSnapshot = existing.queryVariantSnapshots.find(
        (v) => v.id === confirmedVariantId || v.sourceVariantId === confirmedVariantId
      );
      if (matchedSnapshot) {
        targetVariantId = matchedSnapshot.sourceVariantId || matchedSnapshot.id;
      } else {
        const matchedCustom = parseCustomQueryVariants(existing.customQueryVariants).find(
          (row) => row.id === confirmedVariantId
        );
        if (!matchedCustom) {
          return NextResponse.json(
            { error: "Invalid variant ID" },
            { status: 422 }
          );
        }
        targetVariantId = matchedCustom.id;
      }
    }

    const wasFeatured = existing.isFeatured;

    const updated = await prismadb.$transaction(async (tx) => {
      const row = await tx.tourPackageQuery.update({
        where: { id },
        data: {
          confirmedVariantId: targetVariantId,
          isFeatured: targetVariantId ? true : false,
        },
        select: {
          id: true,
          confirmedVariantId: true,
          isFeatured: true,
          inquiryId: true,
        },
      });

      if (targetVariantId && !wasFeatured && row.inquiryId) {
        await tx.inquiry.update({
          where: { id: row.inquiryId },
          data: { status: "CONFIRMED" },
        });
        await tx.inquiryAction.create({
          data: {
            inquiryId: row.inquiryId,
            actionType: "STATUS_CHANGE",
            remarks:
              "Status updated to CONFIRMED automatically when variant was confirmed (mobile).",
          },
        });
      }

      return row;
    });

    return NextResponse.json({
      tourPackageQueryId: updated.id,
      confirmedVariantId: updated.confirmedVariantId,
      isFeatured: updated.isFeatured,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANTS_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
