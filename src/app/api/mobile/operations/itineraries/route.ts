import { NextResponse } from "next/server";
import { z } from "zod";
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
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where = search
      ? {
          OR: [
            { itineraryMasterTitle: { contains: search } },
            { itineraryMasterDescription: { contains: search } },
            { location: { label: { contains: search } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prismadb.itineraryMaster.findMany({
        where,
        include: {
          location: { select: { id: true, label: true } },
          hotel: { select: { id: true, name: true } },
          itineraryMasterImages: { select: { id: true, url: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.itineraryMaster.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map(format),
      total,
      hasMore: offset + rows.length < total,
      nextOffset: offset + rows.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_ITINERARIES_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("ItineraryMaster", key);
    if (prior) {
      const existing = await prismadb.itineraryMaster.findUnique({
        where: { id: prior },
        include: { location: true, hotel: true, itineraryMasterImages: true },
      });
      return NextResponse.json({ id: prior, itinerary: existing ? format(existing) : null, idempotentReplay: true });
    }

    const parsed = itinerarySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid itinerary payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const row = await prismadb.itineraryMaster.create({
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
        itineraryMasterImages: v.images?.length
          ? { createMany: { data: v.images.map((image) => ({ url: image.url })) } }
          : undefined,
      },
      include: { location: true, hotel: true, itineraryMasterImages: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "ItineraryMaster",
      entityId: row.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, locationId: row.locationId },
    });

    return NextResponse.json(format(row), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_ITINERARIES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
