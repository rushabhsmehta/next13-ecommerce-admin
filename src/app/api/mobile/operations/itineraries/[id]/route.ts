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

const itinerarySchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  itineraryMasterTitle: z.string().min(1, "Title is required"),
  itineraryMasterDescription: z.string().min(1, "Description is required"),
  dayNumber: z.coerce.number().int().min(0).optional().nullable(),
  days: z.string().optional().nullable(),
  hotelId: z.string().optional().nullable(),
  roomTypeId: z.string().optional().nullable(),
  occupancyTypeId: z.string().optional().nullable(),
  mealPlanId: z.string().optional().nullable(),
  numberofRooms: z.string().optional().nullable(),
  roomCategory: z.string().optional().nullable(),
  mealsIncluded: z.string().optional().nullable(),
  images: z.array(z.object({ url: z.string().url() })).optional(),
});

function format(row: any) {
  return {
    id: row.id,
    title: row.itineraryMasterTitle,
    description: row.itineraryMasterDescription,
    locationId: row.locationId,
    locationLabel: row.location?.label ?? null,
    dayNumber: row.dayNumber,
    days: row.days,
    hotelId: row.hotelId,
    hotelName: row.hotel?.name ?? null,
    roomTypeId: row.roomTypeId,
    occupancyTypeId: row.occupancyTypeId,
    mealPlanId: row.mealPlanId,
    numberofRooms: row.numberofRooms,
    roomCategory: row.roomCategory,
    mealsIncluded: row.mealsIncluded,
    images: row.itineraryMasterImages ?? [],
    activities: row.activities ?? [],
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const row = await prismadb.itineraryMaster.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        hotel: true,
        itineraryMasterImages: true,
        activities: { include: { activityImages: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) return new NextResponse("Itinerary not found", { status: 404 });
    return NextResponse.json(format(row));
  } catch (error) {
    console.log("[MOBILE_OPS_ITINERARY_GET]", error);
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

    const parsed = itinerarySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid itinerary payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const existing = await prismadb.itineraryMaster.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return new NextResponse("Itinerary not found", { status: 404 });

    const row = await prismadb.itineraryMaster.update({
      where: { id: params.id },
      data: {
        locationId: v.locationId,
        itineraryMasterTitle: v.itineraryMasterTitle,
        itineraryMasterDescription: v.itineraryMasterDescription,
        dayNumber: v.dayNumber ?? undefined,
        days: v.days?.trim() || null,
        hotelId: v.hotelId || null,
        roomTypeId: v.roomTypeId || null,
        occupancyTypeId: v.occupancyTypeId || null,
        mealPlanId: v.mealPlanId || null,
        numberofRooms: v.numberofRooms || null,
        roomCategory: v.roomCategory || null,
        mealsIncluded: v.mealsIncluded || null,
        itineraryMasterImages: {
          deleteMany: {},
          ...(v.images?.length
            ? { createMany: { data: v.images.map((image) => ({ url: image.url })) } }
            : {}),
        },
      },
      include: { location: true, hotel: true, itineraryMasterImages: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "ItineraryMaster",
      entityId: row.id,
      action: "UPDATE",
      metadata: { locationId: row.locationId },
    });

    return NextResponse.json(format(row));
  } catch (error) {
    console.log("[MOBILE_OPS_ITINERARY_PATCH]", error);
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

    const existing = await prismadb.itineraryMaster.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return new NextResponse("Itinerary not found", { status: 404 });

    await prismadb.itineraryMaster.delete({ where: { id: params.id } });
    await recordMobileAudit({
      userId,
      entityType: "ItineraryMaster",
      entityId: params.id,
      action: "DELETE",
    });
    return NextResponse.json({ deleted: true, itinerary: existing });
  } catch (error) {
    console.log("[MOBILE_OPS_ITINERARY_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
