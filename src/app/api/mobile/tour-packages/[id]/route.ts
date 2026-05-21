import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

/**
 * Tour-package detail for mobile admin. The web has many heavy create/copy
 * flows; mobile's role is browse + light edits (rename, feature, archive)
 * and PDF download. Heavy itinerary / hotel composition stays on web.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyMobileBearerUserId(_req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireSalesTripsRead(userId);
    if (!guard.ok) return guard.response;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const pkg = await prismadb.tourPackage.findUnique({
      where: { id },
      select: {
        id: true,
        tourPackageName: true,
        tourPackageType: true,
        tourCategory: true,
        numDaysNight: true,
        price: true,
        pricePerAdult: true,
        pricePerChildOrExtraBed: true,
        pricePerChild5to12YearsNoBed: true,
        pricePerChildwithSeatBelow5Years: true,
        transport: true,
        pickup_location: true,
        drop_location: true,
        isFeatured: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
        itineraries: {
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            dayNumber: true,
            days: true,
            itineraryTitle: true,
            hotel: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { packageVariants: true },
        },
      },
    });

    if (!pkg) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({
      id: pkg.id,
      tourPackageName: pkg.tourPackageName,
      tourPackageType: pkg.tourPackageType,
      tourCategory: pkg.tourCategory,
      numDaysNight: pkg.numDaysNight,
      price: pkg.price,
      pricePerAdult: pkg.pricePerAdult,
      pricePerChildOrExtraBed: pkg.pricePerChildOrExtraBed,
      pricePerChild5to12YearsNoBed: pkg.pricePerChild5to12YearsNoBed,
      pricePerChildwithSeatBelow5Years: pkg.pricePerChildwithSeatBelow5Years,
      transport: pkg.transport,
      pickupLocation: pkg.pickup_location,
      dropLocation: pkg.drop_location,
      isFeatured: pkg.isFeatured,
      isArchived: pkg.isArchived,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
      location: pkg.location,
      itineraries: pkg.itineraries,
      variantCount: pkg._count.packageVariants,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * PATCH only the safe header fields. Hotels, itineraries, pricing detail,
 * variants — all stay on web until we have proper editors on mobile.
 */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireSalesTripsWrite(userId);
    if (!guard.ok) return guard.response;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.tourPackageName === "string") {
      data.tourPackageName = body.tourPackageName.trim();
    }
    if (typeof body.tourPackageType === "string") {
      data.tourPackageType = body.tourPackageType.trim();
    }
    if (typeof body.tourCategory === "string") {
      data.tourCategory = body.tourCategory.trim();
    }
    if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;
    if (typeof body.isArchived === "boolean") data.isArchived = body.isArchived;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided" },
        { status: 400 }
      );
    }

    const updated = await prismadb.tourPackage.update({
      where: { id },
      data,
      select: {
        id: true,
        tourPackageName: true,
        tourPackageType: true,
        tourCategory: true,
        isFeatured: true,
        isArchived: true,
        updatedAt: true,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackage",
      entityId: id,
      action: "UPDATE",
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.log("[MOBILE_TOUR_PACKAGE_PATCH]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update tour package" },
      { status: 500 }
    );
  }
}
