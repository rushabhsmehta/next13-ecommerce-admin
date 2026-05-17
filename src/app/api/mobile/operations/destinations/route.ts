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

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  locationId: z.string().min(1, "Location is required"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

/** Tour destinations — list + create. operations.read / .write. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const locationId = searchParams.get("locationId") ?? undefined;
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (locationId) where.locationId = locationId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prismadb.tourDestination.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          locationId: true,
          isActive: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
          _count: { select: { hotels: true } },
        },
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prismadb.tourDestination.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      locationId: r.locationId,
      locationLabel: r.location.label,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      hotelCount: r._count.hotels,
    }));

    return NextResponse.json({
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_DESTINATIONS_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("TourDestination", key);
    if (prior) {
      const existing = await prismadb.tourDestination.findUnique({
        where: { id: prior },
        select: { id: true, name: true, locationId: true },
      });
      return NextResponse.json(
        { id: prior, destination: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid destination payload", details: parsed.error.flatten() },
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

    const destination = await prismadb.tourDestination.create({
      data: {
        name: v.name.trim(),
        locationId: v.locationId,
        description: v.description?.trim() || null,
        imageUrl:
          v.imageUrl && typeof v.imageUrl === "string" && v.imageUrl.trim()
            ? v.imageUrl.trim()
            : null,
        isActive: v.isActive ?? true,
      } as any,
      select: {
        id: true,
        name: true,
        locationId: true,
        imageUrl: true,
        isActive: true,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourDestination",
      entityId: destination.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        name: destination.name,
        locationId: destination.locationId,
      },
    });

    return NextResponse.json(destination, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_DESTINATIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
