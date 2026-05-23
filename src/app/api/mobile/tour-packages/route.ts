import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSalesTripsRead } from "@/app/api/mobile/lib/assert-sales-trips-access";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  POLICY_FIELD_KEYS,
  stringifyPolicyField,
} from "@/app/api/mobile/tour-packages/policy-fields";
import {
  slugifyTourPackageName,
  tourPackageWriteSchema,
} from "@/app/api/mobile/tour-packages/schemas";

export const dynamic = "force-dynamic";

async function canReadPackages(userId: string) {
  const ops = await requireOperationsRead(userId);
  if (ops.ok) return true;
  const sales = await requireSalesTripsRead(userId);
  return sales.ok;
}

/**
 * Tour package list (picker + operations) and create.
 * GET: salesTrips.read OR operations.read
 * POST: operations.write
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    if (!(await canReadPackages(userId))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId")?.trim() ?? "";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Prisma.TourPackageWhereInput = {};
    if (!includeArchived) where.isArchived = false;
    if (locationId) where.locationId = locationId;
    if (search) {
      where.OR = [
        { tourPackageName: { contains: search } },
        { tourPackageType: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [packages, total] = await Promise.all([
      prismadb.tourPackage.findMany({
        where,
        select: {
          id: true,
          tourPackageName: true,
          tourPackageType: true,
          tourCategory: true,
          numDaysNight: true,
          price: true,
          isArchived: true,
          updatedAt: true,
          location: { select: { id: true, label: true } },
          _count: { select: { itineraries: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.tourPackage.count({ where }),
    ]);

    return NextResponse.json({
      packages: packages.map((p) => ({
        id: p.id,
        tourPackageName: p.tourPackageName,
        tourPackageType: p.tourPackageType,
        tourCategory: p.tourCategory,
        numDaysNight: p.numDaysNight,
        price: p.price,
        isArchived: p.isArchived,
        itineraryCount: p._count.itineraries,
        updatedAt: p.updatedAt.toISOString(),
        location: p.location,
      })),
      total,
      hasMore: offset + packages.length < total,
      nextOffset: offset + packages.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("TourPackage", key);
    if (prior) {
      const existing = await prismadb.tourPackage.findUnique({
        where: { id: prior },
        select: { id: true, tourPackageName: true, locationId: true },
      });
      return NextResponse.json(
        { id: prior, tourPackage: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const parsed = tourPackageWriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid tour package payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const location = await prismadb.location.findUnique({
      where: { id: v.locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const policyData = Object.fromEntries(
      POLICY_FIELD_KEYS.map((key) => [
        key,
        v[key]?.length ? stringifyPolicyField(v[key]) : undefined,
      ]).filter(([, val]) => val !== undefined)
    );

    const created = await prismadb.tourPackage.create({
      data: {
        locationId: v.locationId,
        tourPackageName: v.tourPackageName.trim(),
        tourPackageType: v.tourPackageType?.trim() || "Standard",
        tourCategory: v.tourCategory?.trim() || "Domestic",
        numDaysNight: v.numDaysNight?.trim() || null,
        transport: v.transport?.trim() || null,
        pickup_location: v.pickup_location?.trim() || null,
        drop_location: v.drop_location?.trim() || null,
        price: v.price?.trim() || null,
        slug: slugifyTourPackageName(v.tourPackageName),
        isFeatured: false,
        isArchived: false,
        pricingSection: v.pricingSection?.length
          ? v.pricingSection.map((row) => ({
              name: row.name.trim(),
              price: row.price?.trim() || "",
              description: row.description?.trim() || "",
            }))
          : undefined,
        ...policyData,
        images: v.images?.length
          ? { create: v.images.map((img) => ({ url: img.url.trim() })) }
          : undefined,
        itineraries: v.itineraries?.length
          ? {
              create: v.itineraries.map((day) => ({
                locationId: v.locationId,
                dayNumber: day.dayNumber,
                days: String(day.dayNumber),
                itineraryTitle: day.itineraryTitle.trim(),
                itineraryDescription: day.itineraryDescription?.trim() || null,
                mealsIncluded: day.mealsIncluded?.trim() || null,
              })),
            }
          : undefined,
      },
      select: { id: true, tourPackageName: true, locationId: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackage",
      entityId: created.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        locationId: v.locationId,
      },
    });

    return NextResponse.json({ id: created.id, tourPackage: created }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
