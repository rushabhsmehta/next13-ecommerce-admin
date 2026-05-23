import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
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
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const variants = await prismadb.packageVariant.findMany({
      where: { tourPackageId: params.id },
      include: variantInclude,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      variants: variants.map(formatVariant),
      total: variants.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANTS_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("PackageVariant", key);
    if (prior) {
      const existing = await prismadb.packageVariant.findUnique({
        where: { id: prior },
        include: variantInclude,
      });
      if (existing) {
        return NextResponse.json({ ...formatVariant(existing), idempotentReplay: true });
      }
    }

    const pkg = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!pkg) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    const parsed = variantWriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid variant payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    if (v.isDefault) {
      await prismadb.packageVariant.updateMany({
        where: { tourPackageId: params.id },
        data: { isDefault: false },
      });
    }

    const created = await prismadb.packageVariant.create({
      data: {
        tourPackageId: params.id,
        name: v.name.trim(),
        description: v.description?.trim() || null,
        isDefault: v.isDefault ?? false,
        sortOrder: v.sortOrder ?? 0,
        priceModifier: v.priceModifier ?? 0,
      },
      include: variantInclude,
    });

    await recordMobileAudit({
      userId,
      entityType: "PackageVariant",
      entityId: created.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, tourPackageId: params.id },
    });

    return NextResponse.json(formatVariant(created), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
