import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { variantWriteSchema } from "@/app/api/mobile/tour-packages/schemas";

export const dynamic = "force-dynamic";

function formatVariant(row: {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  priceModifier: number | null;
  tourPackageId: string | null;
  variantHotelMappings?: {
    id: string;
    itineraryId: string;
    hotelId: string;
    itinerary: { id: string; dayNumber: number | null; itineraryTitle: string | null };
    hotel: { id: string; name: string };
  }[];
  _count?: { tourPackagePricings: number };
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    priceModifier: row.priceModifier,
    tourPackageId: row.tourPackageId,
    pricingCount: row._count?.tourPackagePricings ?? 0,
    hotelMappings: (row.variantHotelMappings ?? []).map((m) => ({
      id: m.id,
      itineraryId: m.itineraryId,
      hotelId: m.hotelId,
      dayNumber: m.itinerary.dayNumber,
      itineraryTitle: m.itinerary.itineraryTitle,
      hotelName: m.hotel.name,
    })),
  };
}

const variantInclude = {
  variantHotelMappings: {
    include: {
      itinerary: { select: { id: true, dayNumber: true, itineraryTitle: true } },
      hotel: { select: { id: true, name: true } },
    },
    orderBy: { itinerary: { dayNumber: "asc" as const } },
  },
  _count: { select: { tourPackagePricings: true } },
} as const;

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const variant = await prismadb.packageVariant.findFirst({
      where: { id: params.variantId, tourPackageId: params.id },
      include: variantInclude,
    });
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json(formatVariant(variant));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANT_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.packageVariant.findFirst({
      where: { id: params.variantId, tourPackageId: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const parsed = variantWriteSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid variant payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    if (v.isDefault) {
      await prismadb.packageVariant.updateMany({
        where: { tourPackageId: params.id, id: { not: params.variantId } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (v.name !== undefined) data.name = v.name.trim();
    if (v.description !== undefined) data.description = v.description?.trim() || null;
    if (v.isDefault !== undefined) data.isDefault = v.isDefault;
    if (v.sortOrder !== undefined) data.sortOrder = v.sortOrder;
    if (v.priceModifier !== undefined) data.priceModifier = v.priceModifier;

    const updated = await prismadb.packageVariant.update({
      where: { id: params.variantId },
      data,
      include: variantInclude,
    });

    await recordMobileAudit({
      userId,
      entityType: "PackageVariant",
      entityId: params.variantId,
      action: "UPDATE",
      metadata: { tourPackageId: params.id, fields: Object.keys(v) },
    });

    return NextResponse.json(formatVariant(updated));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANT_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.packageVariant.findFirst({
      where: { id: params.variantId, tourPackageId: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    await prismadb.packageVariant.delete({ where: { id: params.variantId } });

    await recordMobileAudit({
      userId,
      entityType: "PackageVariant",
      entityId: params.variantId,
      action: "DELETE",
      metadata: { tourPackageId: params.id },
    });

    return NextResponse.json({ deleted: true, id: params.variantId });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
