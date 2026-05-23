import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { tourPackagePricingWriteSchema } from "@/app/api/mobile/tour-packages/schemas";

export const dynamic = "force-dynamic";

function formatPricingRow(row: {
  id: string;
  tourPackageId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  description: string | null;
  numberOfRooms: number;
  isGroupPricing: boolean;
  mealPlanId: string;
  packageVariantId: string | null;
  vehicleTypeId: string | null;
  locationSeasonalPeriodId: string | null;
  mealPlan: { id: string; name: string; code: string };
  vehicleType: { id: string; name: string } | null;
  locationSeasonalPeriod: { id: string; name: string } | null;
  packageVariant: { id: string; name: string } | null;
  pricingComponents: {
    id: string;
    pricingAttributeId: string;
    price: number;
    purchasePrice: number | null;
    description: string | null;
    pricingAttribute: { id: string; name: string; sortOrder: number };
  }[];
}) {
  const totalPrice = row.pricingComponents.reduce((sum, c) => sum + c.price, 0);
  return {
    id: row.id,
    tourPackageId: row.tourPackageId,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    isActive: row.isActive,
    description: row.description,
    numberOfRooms: row.numberOfRooms,
    isGroupPricing: row.isGroupPricing,
    mealPlanId: row.mealPlanId,
    mealPlanName: row.mealPlan.name,
    mealPlanCode: row.mealPlan.code,
    packageVariantId: row.packageVariantId,
    packageVariantName: row.packageVariant?.name ?? null,
    vehicleTypeId: row.vehicleTypeId,
    vehicleTypeName: row.vehicleType?.name ?? null,
    locationSeasonalPeriodId: row.locationSeasonalPeriodId,
    seasonalPeriodName: row.locationSeasonalPeriod?.name ?? null,
    totalPrice,
    pricingComponents: row.pricingComponents.map((c) => ({
      id: c.id,
      pricingAttributeId: c.pricingAttributeId,
      pricingAttributeName: c.pricingAttribute.name,
      price: c.price,
      purchasePrice: c.purchasePrice,
      description: c.description,
    })),
  };
}

const pricingInclude = {
  mealPlan: { select: { id: true, name: true, code: true } },
  vehicleType: { select: { id: true, name: true } },
  locationSeasonalPeriod: { select: { id: true, name: true } },
  packageVariant: { select: { id: true, name: true } },
  pricingComponents: {
    include: {
      pricingAttribute: { select: { id: true, name: true, sortOrder: true } },
    },
    orderBy: { pricingAttribute: { sortOrder: "asc" as const } },
  },
} as const;

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const row = await prismadb.tourPackagePricing.findFirst({
      where: { id: params.pricingId, tourPackageId: params.id },
      include: pricingInclude,
    });
    if (!row) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    return NextResponse.json(formatPricingRow(row));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_PRICING_ID_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.tourPackagePricing.findFirst({
      where: { id: params.pricingId, tourPackageId: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    const parsed = tourPackagePricingWriteSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const data: Record<string, unknown> = {};

    if (v.startDate !== undefined) {
      const startDate = dateToUtc(v.startDate);
      if (!startDate) {
        return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
      }
      data.startDate = startDate;
    }
    if (v.endDate !== undefined) {
      const endDate = dateToUtc(v.endDate);
      if (!endDate) {
        return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
      }
      data.endDate = endDate;
    }
    if (v.mealPlanId !== undefined) data.mealPlanId = v.mealPlanId;
    if (v.numberOfRooms !== undefined) data.numberOfRooms = v.numberOfRooms;
    if (v.packageVariantId !== undefined) data.packageVariantId = v.packageVariantId || null;
    if (v.vehicleTypeId !== undefined) data.vehicleTypeId = v.vehicleTypeId || null;
    if (v.locationSeasonalPeriodId !== undefined) {
      data.locationSeasonalPeriodId = v.locationSeasonalPeriodId || null;
    }
    if (v.description !== undefined) data.description = v.description?.trim() || null;
    if (v.isGroupPricing !== undefined) data.isGroupPricing = v.isGroupPricing;
    if (v.isActive !== undefined) data.isActive = v.isActive;

    if (v.packageVariantId) {
      const variant = await prismadb.packageVariant.findFirst({
        where: { id: v.packageVariantId, tourPackageId: params.id },
        select: { id: true },
      });
      if (!variant) {
        return NextResponse.json({ error: "Package variant not found" }, { status: 404 });
      }
    }

    const updated = await prismadb.$transaction(async (tx) => {
      if (v.pricingComponents) {
        await tx.pricingComponent.deleteMany({
          where: { tourPackagePricingId: params.pricingId },
        });
        data.pricingComponents = {
          create: v.pricingComponents.map((c) => ({
            pricingAttributeId: c.pricingAttributeId,
            price: c.price,
            purchasePrice: c.purchasePrice ?? null,
            description: c.description?.trim() || null,
          })),
        };
      }

      return tx.tourPackagePricing.update({
        where: { id: params.pricingId },
        data,
        include: pricingInclude,
      });
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackagePricing",
      entityId: params.pricingId,
      action: "UPDATE",
      metadata: { tourPackageId: params.id, fields: Object.keys(v) },
    });

    return NextResponse.json(formatPricingRow(updated));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_PRICING_ID_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.tourPackagePricing.findFirst({
      where: { id: params.pricingId, tourPackageId: params.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pricing not found" }, { status: 404 });
    }

    await prismadb.tourPackagePricing.delete({ where: { id: params.pricingId } });

    await recordMobileAudit({
      userId,
      entityType: "TourPackagePricing",
      entityId: params.pricingId,
      action: "DELETE",
      metadata: { tourPackageId: params.id },
    });

    return NextResponse.json({ deleted: true, id: params.pricingId });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_PRICING_ID_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
