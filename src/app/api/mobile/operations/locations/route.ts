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
import { normalizeSlugInput } from "@/lib/location-slug";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  label: z.string().min(1, "Label is required").max(200),
  imageUrl: z.string().url("Image URL is required"),
  slug: z.string().max(200).optional().nullable(),
  tags: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/** Locations — list + create. operations.read / .write. */
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
            { label: { contains: search } },
            { slug: { contains: search } },
            { tags: { contains: search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prismadb.location.findMany({
        where,
        select: {
          id: true,
          label: true,
          imageUrl: true,
          slug: true,
          tags: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { tourDestinations: true, hotels: true },
          },
        },
        orderBy: { label: "asc" },
        skip: offset,
        take: limit,
      }),
      prismadb.location.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      label: r.label,
      imageUrl: r.imageUrl,
      slug: r.slug,
      tags: r.tags,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      destinationCount: r._count.tourDestinations,
      hotelCount: r._count.hotels,
    }));

    return NextResponse.json({
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATIONS_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("Location", key);
    if (prior) {
      const existing = await prismadb.location.findUnique({
        where: { id: prior },
        select: { id: true, label: true, imageUrl: true },
      });
      return NextResponse.json(
        { id: prior, location: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid location payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const location = await prismadb.location.create({
      data: {
        label: v.label.trim(),
        imageUrl: v.imageUrl.trim(),
        slug: normalizeSlugInput(v.slug, v.label),
        tags: v.tags?.trim() || null,
        isActive: v.isActive ?? true,
      } as any,
      select: { id: true, label: true, imageUrl: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Location",
      entityId: location.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        label: location.label,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATIONS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
