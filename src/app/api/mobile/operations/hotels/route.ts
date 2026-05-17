import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  readIdempotencyKey,
  findPriorIdempotentEntityId,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const imageSchema = z.object({ url: z.string().min(1, "Image URL is required") });

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  locationId: z.string().min(1, "Location is required"),
  destinationId: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  images: z.array(imageSchema).min(1, "At least one image is required"),
});

/** Hotels — list + create. operations.read / .write. Hotel pricing deferred (2b). */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId") ?? undefined;
    const destinationId = searchParams.get("destinationId") ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;
    if (destinationId) where.destinationId = destinationId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { location: { label: { contains: search } } },
        { destination: { name: { contains: search } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prismadb.hotel.findMany({
        where,
        select: {
          id: true,
          name: true,
          link: true,
          locationId: true,
          destinationId: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
          destination: { select: { id: true, name: true } },
          images: {
            select: { url: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
          _count: { select: { images: true, seasonalPricing: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.hotel.count({ where }),
    ]);

    const items = rows.map((h) => ({
      id: h.id,
      name: h.name,
      link: h.link,
      locationId: h.locationId,
      locationLabel: h.location.label,
      destinationId: h.destinationId,
      destinationName: h.destination?.name ?? null,
      heroImageUrl: h.images[0]?.url ?? null,
      imageCount: h._count.images,
      pricingCount: h._count.seasonalPricing,
      createdAt: h.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTELS_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("Hotel", key);
    if (prior) {
      const existing = await prismadb.hotel.findUnique({
        where: { id: prior },
        select: { id: true, name: true, locationId: true },
      });
      return NextResponse.json(
        { id: prior, hotel: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
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

    const hotel = await prismadb.hotel.create({
      data: {
        name: v.name.trim(),
        locationId: v.locationId,
        destinationId: v.destinationId || null,
        link: v.link?.trim() || null,
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
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        name: hotel.name,
        locationId: hotel.locationId,
      },
    });

    return NextResponse.json(hotel, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTELS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
