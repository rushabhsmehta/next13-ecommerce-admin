import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const imageSchema = z.object({ url: z.string().min(1) });

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  locationId: z.string().min(1),
  destinationId: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  images: z.array(imageSchema).min(1, "At least one image is required"),
});

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const hotel = await prismadb.hotel.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        link: true,
        locationId: true,
        destinationId: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
        destination: { select: { id: true, name: true } },
        images: {
          select: { id: true, url: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!hotel) return new NextResponse("Not found", { status: 404 });

    const [
      pricingCount,
      itineraryCount,
      itineraryMasterCount,
      variantMappings,
      variantSnapshots,
    ] = await Promise.all([
      prismadb.hotelPricing.count({ where: { hotelId: params.id } }),
      prismadb.itinerary.count({ where: { hotelId: params.id } }),
      prismadb.itineraryMaster.count({ where: { hotelId: params.id } }),
      prismadb.variantHotelMapping.count({ where: { hotelId: params.id } }),
      prismadb.queryVariantHotelSnapshot.count({ where: { hotelId: params.id } }),
    ]);

    return NextResponse.json({
      hotel: {
        id: hotel.id,
        name: hotel.name,
        link: hotel.link,
        locationId: hotel.locationId,
        locationLabel: hotel.location.label,
        destinationId: hotel.destinationId,
        destinationName: hotel.destination?.name ?? null,
        images: hotel.images.map((i) => ({ url: i.url })),
        createdAt: hotel.createdAt.toISOString(),
        updatedAt: hotel.updatedAt.toISOString(),
      },
      summary: {
        pricingCount,
        itineraryCount,
        itineraryMasterCount,
        variantMappings,
        variantSnapshots,
        linkedCount:
          pricingCount +
          itineraryCount +
          itineraryMasterCount +
          variantMappings +
          variantSnapshots,
      },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid hotel payload", details: parsed.error.flatten() },
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

    if (v.destinationId) {
      const dest = await prismadb.tourDestination.findFirst({
        where: { id: v.destinationId, locationId: v.locationId },
        select: { id: true },
      });
      if (!dest) {
        return NextResponse.json(
          { error: "Destination not found for this location" },
          { status: 404 }
        );
      }
    }

    // Mirror web PATCH: replace scalar fields, wipe images, recreate gallery.
    await prismadb.hotel.update({
      where: { id: params.id },
      data: {
        name: v.name.trim(),
        locationId: v.locationId,
        destinationId: v.destinationId || null,
        link: v.link?.trim() || null,
        images: { deleteMany: {} },
      } as any,
    });

    const hotel = await prismadb.hotel.update({
      where: { id: params.id },
      data: {
        images: {
          createMany: {
            data: v.images.map((img) => ({ url: img.url.trim() })),
          },
        },
      } as any,
      select: { id: true, name: true, locationId: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Hotel",
      entityId: hotel.id,
      action: "UPDATE",
      metadata: { name: hotel.name, locationId: hotel.locationId },
    });

    return NextResponse.json(hotel);
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const [
      pricingCount,
      itineraryCount,
      itineraryMasterCount,
      variantMappings,
      variantSnapshots,
    ] = await Promise.all([
      prismadb.hotelPricing.count({ where: { hotelId: params.id } }),
      prismadb.itinerary.count({ where: { hotelId: params.id } }),
      prismadb.itineraryMaster.count({ where: { hotelId: params.id } }),
      prismadb.variantHotelMapping.count({ where: { hotelId: params.id } }),
      prismadb.queryVariantHotelSnapshot.count({ where: { hotelId: params.id } }),
    ]);
    const linked =
      pricingCount +
      itineraryCount +
      itineraryMasterCount +
      variantMappings +
      variantSnapshots;

    if (linked > 0) {
      return NextResponse.json(
        {
          error: `Hotel has ${linked} linked record(s) (pricing, itineraries, variants) and cannot be deleted.`,
        },
        { status: 409 }
      );
    }

    const hotel = await prismadb.hotel.delete({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Hotel",
      entityId: hotel.id,
      action: "DELETE",
      metadata: { name: hotel.name },
    });

    return NextResponse.json({ deleted: true, hotel });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
