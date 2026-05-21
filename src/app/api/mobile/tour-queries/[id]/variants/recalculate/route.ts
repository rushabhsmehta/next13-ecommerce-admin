import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { calculateVariantPricing } from "@/lib/pricing-calculator";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/tour-queries/[id]/variants/recalculate
 *
 * Body: { variantId: string, markup?: number }
 *
 * Recomputes variant pricing using the stored variantRoomAllocations,
 * variantTransportDetails, itineraries, and tour dates. Persists the result
 * into variantPricingData (keyed by source variantId when known, else
 * snapshot id). Returns the freshly computed slice.
 *
 * No client-side authority over inputs other than the markup — the rest is
 * fetched from the query so the server remains the pricing source of truth.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const variantId = typeof body?.variantId === "string" ? body.variantId.trim() : "";
    const markup =
      typeof body?.markup === "number" && Number.isFinite(body.markup)
        ? Math.max(0, body.markup)
        : 0;

    if (!variantId) {
      return NextResponse.json({ error: "variantId is required" }, { status: 400 });
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        tourStartsFrom: true,
        tourEndsOn: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        variantRoomAllocations: true,
        variantTransportDetails: true,
        variantPricingData: true,
        queryVariantSnapshots: {
          select: { id: true, name: true, sourceVariantId: true },
        },
        itineraries: {
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            locationId: true,
            hotelId: true,
            roomAllocations: {
              select: {
                id: true,
                roomTypeId: true,
                occupancyTypeId: true,
                mealPlanId: true,
                quantity: true,
              },
            },
            transportDetails: {
              select: {
                id: true,
                vehicleTypeId: true,
                quantity: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!tpq.tourStartsFrom || !tpq.tourEndsOn) {
      return NextResponse.json(
        { error: "Tour start and end dates must be set before computing pricing" },
        { status: 400 }
      );
    }

    const snapshot = tpq.queryVariantSnapshots.find(
      (s) => s.id === variantId || s.sourceVariantId === variantId
    );
    if (!snapshot) {
      return NextResponse.json(
        { error: "Variant not found on this query" },
        { status: 404 }
      );
    }

    // Use sourceVariantId for pricing lookup when available — that matches the
    // shape variantRoomAllocations/variantTransportDetails are keyed by.
    const lookupId = snapshot.sourceVariantId ?? snapshot.id;

    const itinerariesForPricing = tpq.itineraries.map((it) => ({
      id: it.id,
      dayNumber: it.dayNumber,
      locationId: it.locationId,
      hotelId: it.hotelId,
      roomAllocations: it.roomAllocations,
      transportDetails: it.transportDetails,
    }));

    const result = await calculateVariantPricing({
      variantId: lookupId,
      variantRoomAllocations: tpq.variantRoomAllocations,
      variantTransportDetails: tpq.variantTransportDetails,
      itineraries: itinerariesForPricing,
      tourStartsFrom: tpq.tourStartsFrom,
      tourEndsOn: tpq.tourEndsOn,
      markup,
    });

    const calculatedAt = new Date().toISOString();
    const nextPricingMap: Record<string, any> = {
      ...((tpq.variantPricingData as Record<string, any> | null) ?? {}),
      [lookupId]: {
        totalCost: result.totalCost,
        basePrice: result.basePrice,
        appliedMarkup: result.appliedMarkup,
        breakdown: result.breakdown,
        calculatedAt,
      },
    };

    await prismadb.tourPackageQuery.update({
      where: { id },
      data: { variantPricingData: nextPricingMap as any },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQueryVariant",
      entityId: id,
      action: "UPDATE",
      metadata: {
        event: "recalculate",
        variantId: lookupId,
        markup,
        totalCost: result.totalCost,
      },
    });

    return NextResponse.json({
      variantId: lookupId,
      pricing: {
        totalCost: result.totalCost,
        basePrice: result.basePrice,
        markupPercentage: result.appliedMarkup?.percentage ?? 0,
        markupAmount: result.appliedMarkup?.amount ?? 0,
        accommodation: result.breakdown?.accommodation ?? 0,
        transport: result.breakdown?.transport ?? 0,
        calculatedAt,
      },
    });
  } catch (error: any) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_RECALC]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to recalculate variant pricing" },
      { status: 500 }
    );
  }
}
