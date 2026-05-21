import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/tour-queries/[id]/variants/confirm
 *
 * Body: { variantId: string | null }
 *
 * Marks one variant as the confirmed/booked option for this query (or clears
 * the confirmation when variantId is null). The id can be either a snapshot
 * id or the original sourceVariantId — both are accepted.
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
    const variantId =
      typeof body?.variantId === "string" && body.variantId.trim()
        ? body.variantId.trim()
        : null;

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        isFeatured: true,
        queryVariantSnapshots: {
          select: { id: true, sourceVariantId: true },
        },
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (variantId) {
      const exists = tpq.queryVariantSnapshots.some(
        (s) => s.id === variantId || s.sourceVariantId === variantId
      );
      if (!exists) {
        return NextResponse.json(
          { error: "Variant not found on this query" },
          { status: 404 }
        );
      }
    }

    await prismadb.tourPackageQuery.update({
      where: { id },
      data: {
        confirmedVariantId: variantId,
        // Mirror the web behavior: confirming auto-sets the featured flag.
        isFeatured: variantId ? true : tpq.isFeatured,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQueryVariant",
      entityId: id,
      action: "UPDATE",
      metadata: {
        event: variantId ? "confirm" : "unconfirm",
        variantId,
      },
    });

    return NextResponse.json({
      confirmedVariantId: variantId,
    });
  } catch (error: any) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_CONFIRM]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to confirm variant" },
      { status: 500 }
    );
  }
}
