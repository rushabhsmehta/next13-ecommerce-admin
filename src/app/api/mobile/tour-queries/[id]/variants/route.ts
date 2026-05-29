import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";

export const dynamic = "force-dynamic";

type VariantPricing = {
  totalCost?: number;
  basePrice?: number;
  appliedMarkup?: { percentage?: number; amount?: number };
  breakdown?: { accommodation?: number; transport?: number };
  calculatedAt?: string;
};

/**
 * Variant comparison for a tour query. Returns each variant snapshot paired
 * with the server-computed pricing the web stored in `variantPricingData`
 * (keyed by variant id). Read-only — pricing remains server-authoritative;
 * mobile only compares.
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
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        queryVariantSnapshots: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
            sourceVariantId: true,
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

    const variants = tpq.queryVariantSnapshots.map((snap) => {
      // Pricing is keyed by the source variant id when present, else snapshot id.
      const pricing =
        (snap.sourceVariantId && pricingMap[snap.sourceVariantId]) ||
        pricingMap[snap.id] ||
        null;
      return {
        id: snap.id,
        name: snap.name,
        sortOrder: snap.sortOrder,
        sourceVariantId: snap.sourceVariantId,
        isConfirmed:
          tpq.confirmedVariantId != null &&
          (tpq.confirmedVariantId === snap.id ||
            tpq.confirmedVariantId === snap.sourceVariantId),
        pricing: pricing
          ? {
              totalCost: Number(pricing.totalCost ?? 0),
              basePrice: Number(pricing.basePrice ?? 0),
              markupPercentage: Number(pricing.appliedMarkup?.percentage ?? 0),
              markupAmount: Number(pricing.appliedMarkup?.amount ?? 0),
              accommodation: Number(pricing.breakdown?.accommodation ?? 0),
              transport: Number(pricing.breakdown?.transport ?? 0),
              calculatedAt: pricing.calculatedAt ?? null,
            }
          : null,
      };
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      confirmedVariantId: tpq.confirmedVariantId,
      hasPricing: Object.keys(pricingMap).length > 0,
      variants,
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
      // Validate that the variant exists in the snapshots
      const matched = existing.queryVariantSnapshots.find(
        (v) => v.id === confirmedVariantId || v.sourceVariantId === confirmedVariantId
      );
      if (!matched) {
        return NextResponse.json(
          { error: "Invalid variant ID" },
          { status: 422 }
        );
      }
      // Store the sourceVariantId if present, else the snapshot id
      targetVariantId = matched.sourceVariantId || matched.id;
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
            remarks: "Status updated to CONFIRMED automatically when variant was confirmed (mobile).",
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
