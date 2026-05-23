import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const pkg = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true, tourPackageName: true, locationId: true },
    });
    if (!pkg) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const packageVariantId = searchParams.get("packageVariantId");
    const includeGlobal = searchParams.get("includeGlobal") !== "false";
    const onlyGlobal = searchParams.get("onlyGlobal") === "true";
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = {
      tourPackageId: params.id,
    };
    if (activeOnly) where.isActive = true;

    if (startDate && endDate) {
      const start = dateToUtc(startDate);
      const end = dateToUtc(endDate);
      if (start && end) {
        where.AND = [{ startDate: { lte: end } }, { endDate: { gte: start } }];
      }
    }

    if (onlyGlobal) {
      where.packageVariantId = null;
    } else if (packageVariantId) {
      if (includeGlobal) {
        where.OR = [{ packageVariantId }, { packageVariantId: null }];
      } else {
        where.packageVariantId = packageVariantId;
      }
    }

    const rows = await prismadb.tourPackagePricing.findMany({
      where,
      include: pricingInclude,
      orderBy: { startDate: "asc" },
    });

    const items = rows.map(formatPricingRow);
    return NextResponse.json({
      package: {
        id: pkg.id,
        tourPackageName: pkg.tourPackageName,
        locationId: pkg.locationId,
      },
      items,
      total: items.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_PRICING_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("TourPackagePricing", key);
    if (prior) {
      const existing = await prismadb.tourPackagePricing.findUnique({
        where: { id: prior },
        include: pricingInclude,
      });
      if (existing) {
        return NextResponse.json({ ...formatPricingRow(existing), idempotentReplay: true });
      }
    }

    const pkg = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!pkg) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    const parsed = tourPackagePricingWriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const startDate = dateToUtc(v.startDate);
    const endDate = dateToUtc(v.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }

    if (v.packageVariantId) {
      const variant = await prismadb.packageVariant.findFirst({
        where: { id: v.packageVariantId, tourPackageId: params.id },
        select: { id: true },
      });
      if (!variant) {
        return NextResponse.json({ error: "Package variant not found" }, { status: 404 });
      }
    }

    const created = await prismadb.tourPackagePricing.create({
      data: {
        tourPackageId: params.id,
        startDate,
        endDate,
        mealPlanId: v.mealPlanId,
        numberOfRooms: v.numberOfRooms,
        packageVariantId: v.packageVariantId || null,
        vehicleTypeId: v.vehicleTypeId || null,
        locationSeasonalPeriodId: v.locationSeasonalPeriodId || null,
        description: v.description?.trim() || null,
        isGroupPricing: v.isGroupPricing ?? false,
        isActive: v.isActive ?? true,
        pricingComponents: {
          create: v.pricingComponents.map((c) => ({
            pricingAttributeId: c.pricingAttributeId,
            price: c.price,
            purchasePrice: c.purchasePrice ?? null,
            description: c.description?.trim() || null,
          })),
        },
      },
      include: pricingInclude,
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackagePricing",
      entityId: created.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, tourPackageId: params.id },
    });

    return NextResponse.json(formatPricingRow(created), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_PRICING_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
