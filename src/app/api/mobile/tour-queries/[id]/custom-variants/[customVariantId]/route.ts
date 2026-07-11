import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  findCustomQueryVariant,
  parseCustomQueryVariants,
  stripVariantKeyedMaps,
} from "@/app/api/mobile/lib/custom-query-variants";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
});

/**
 * Rename a custom query variant.
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; customVariantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const customVariantId = params.customVariantId?.trim();
    if (!id || !customVariantId) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid custom variant payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    if (parsed.data.name === undefined && parsed.data.description === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 422 });
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        customQueryVariants: true,
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const existing = parseCustomQueryVariants(tpq.customQueryVariants);
    const index = existing.findIndex((row) => row.id === customVariantId);
    if (index < 0) {
      return NextResponse.json({ error: "Custom variant not found" }, { status: 404 });
    }

    const updated = {
      ...existing[index],
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || "" }
        : {}),
    };
    const nextCustom = [...existing];
    nextCustom[index] = updated;

    await prismadb.tourPackageQuery.update({
      where: { id: tpq.id },
      data: { customQueryVariants: nextCustom },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: tpq.id,
      action: "UPDATE",
      metadata: { customVariantId, action: "rename_custom_variant" },
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      variant: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        sortOrder: updated.sortOrder,
        sourceVariantId: null,
        isCustom: true,
      },
      customQueryVariants: nextCustom,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_CUSTOM_VARIANT_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Delete a custom query variant and clear sibling JSON keys.
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; customVariantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const customVariantId = params.customVariantId?.trim();
    if (!id || !customVariantId) return new NextResponse("Missing id", { status: 400 });

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        customQueryVariants: true,
        confirmedVariantId: true,
        variantHotelOverrides: true,
        variantRoomAllocations: true,
        variantTransportDetails: true,
        variantPricingData: true,
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!findCustomQueryVariant(tpq.customQueryVariants, customVariantId)) {
      return NextResponse.json({ error: "Custom variant not found" }, { status: 404 });
    }

    const nextCustom = parseCustomQueryVariants(tpq.customQueryVariants).filter(
      (row) => row.id !== customVariantId
    );
    const stripped = stripVariantKeyedMaps(
      {
        variantHotelOverrides: tpq.variantHotelOverrides,
        variantRoomAllocations: tpq.variantRoomAllocations,
        variantTransportDetails: tpq.variantTransportDetails,
        variantPricingData: tpq.variantPricingData,
      },
      customVariantId
    );

    const clearConfirm = tpq.confirmedVariantId === customVariantId;

    await prismadb.tourPackageQuery.update({
      where: { id: tpq.id },
      data: {
        customQueryVariants: nextCustom,
        variantHotelOverrides: stripped.variantHotelOverrides,
        variantRoomAllocations: stripped.variantRoomAllocations,
        variantTransportDetails: stripped.variantTransportDetails,
        variantPricingData: stripped.variantPricingData,
        ...(clearConfirm
          ? { confirmedVariantId: null, isFeatured: false }
          : {}),
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: tpq.id,
      action: "UPDATE",
      metadata: { customVariantId, action: "delete_custom_variant" },
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      deletedVariantId: customVariantId,
      customQueryVariants: nextCustom,
      confirmedVariantId: clearConfirm ? null : tpq.confirmedVariantId,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_CUSTOM_VARIANT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
