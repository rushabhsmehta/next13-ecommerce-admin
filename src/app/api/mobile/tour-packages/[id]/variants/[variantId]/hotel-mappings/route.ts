import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { variantHotelMappingsSchema } from "@/app/api/mobile/tour-packages/schemas";

export const dynamic = "force-dynamic";

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
      select: { id: true },
    });
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const mappings = await prismadb.variantHotelMapping.findMany({
      where: { packageVariantId: params.variantId },
      include: {
        itinerary: { select: { id: true, dayNumber: true, itineraryTitle: true } },
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { itinerary: { dayNumber: "asc" } },
    });

    return NextResponse.json({
      mappings: mappings.map((m) => ({
        id: m.id,
        itineraryId: m.itineraryId,
        hotelId: m.hotelId,
        dayNumber: m.itinerary.dayNumber,
        itineraryTitle: m.itinerary.itineraryTitle,
        hotelName: m.hotel.name,
      })),
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANT_MAPPINGS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const variant = await prismadb.packageVariant.findFirst({
      where: { id: params.variantId, tourPackageId: params.id },
      select: { id: true },
    });
    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const parsed = variantHotelMappingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid mappings payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const mappings = parsed.data.mappings;
    const itineraryIds = Array.from(new Set(mappings.map((m) => m.itineraryId)));
    const hotelIds = Array.from(new Set(mappings.map((m) => m.hotelId)));

    const [itineraries, hotels] = await Promise.all([
      prismadb.itinerary.findMany({
        where: { id: { in: itineraryIds }, tourPackageId: params.id },
        select: { id: true },
      }),
      prismadb.hotel.findMany({
        where: { id: { in: hotelIds } },
        select: { id: true },
      }),
    ]);

    if (itineraries.length !== itineraryIds.length || hotels.length !== hotelIds.length) {
      return NextResponse.json(
        { error: "One or more itinerary/hotel IDs are invalid for this package" },
        { status: 422 }
      );
    }

    await prismadb.$transaction(async (tx) => {
      await tx.variantHotelMapping.deleteMany({
        where: { packageVariantId: params.variantId },
      });
      if (mappings.length > 0) {
        await tx.variantHotelMapping.createMany({
          data: mappings.map((m) => ({
            packageVariantId: params.variantId,
            itineraryId: m.itineraryId,
            hotelId: m.hotelId,
          })),
        });
      }
    });

    await recordMobileAudit({
      userId,
      entityType: "VariantHotelMapping",
      entityId: params.variantId,
      action: "UPDATE",
      metadata: { tourPackageId: params.id, count: mappings.length },
    });

    const updated = await prismadb.variantHotelMapping.findMany({
      where: { packageVariantId: params.variantId },
      include: {
        itinerary: { select: { id: true, dayNumber: true, itineraryTitle: true } },
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { itinerary: { dayNumber: "asc" } },
    });

    return NextResponse.json({
      mappings: updated.map((m) => ({
        id: m.id,
        itineraryId: m.itineraryId,
        hotelId: m.hotelId,
        dayNumber: m.itinerary.dayNumber,
        itineraryTitle: m.itinerary.itineraryTitle,
        hotelName: m.hotel.name,
      })),
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGE_VARIANT_MAPPINGS_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
