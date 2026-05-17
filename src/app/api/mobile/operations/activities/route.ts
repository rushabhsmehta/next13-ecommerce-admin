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

const activitySchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  activityMasterTitle: z.string().min(1, "Title is required"),
  activityMasterDescription: z.string().min(1, "Description is required"),
  itineraryId: z.string().optional().nullable(),
  images: z.array(z.object({ url: z.string().url() })).optional(),
});

function format(row: any) {
  return {
    id: row.id,
    title: row.activityMasterTitle,
    description: row.activityMasterDescription,
    locationId: row.locationId,
    locationLabel: row.location?.label ?? null,
    itineraryId: row.itineraryId,
    images: row.activityMasterImages ?? [],
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
            { activityMasterTitle: { contains: search } },
            { activityMasterDescription: { contains: search } },
            { location: { label: { contains: search } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prismadb.activityMaster.findMany({
        where,
        include: {
          location: { select: { id: true, label: true } },
          activityMasterImages: { select: { id: true, url: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.activityMaster.count({ where }),
    ]);

    return NextResponse.json({
      items: rows.map(format),
      total,
      hasMore: offset + rows.length < total,
      nextOffset: offset + rows.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_ACTIVITIES_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("ActivityMaster", key);
    if (prior) {
      const existing = await prismadb.activityMaster.findUnique({
        where: { id: prior },
        include: { location: true, activityMasterImages: true },
      });
      return NextResponse.json({ id: prior, activity: existing ? format(existing) : null, idempotentReplay: true });
    }

    const parsed = activitySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid activity payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;
    const row = await prismadb.activityMaster.create({
      data: {
        locationId: v.locationId,
        activityMasterTitle: v.activityMasterTitle,
        activityMasterDescription: v.activityMasterDescription,
        itineraryId: v.itineraryId || null,
        activityMasterImages: v.images?.length
          ? { createMany: { data: v.images.map((image) => ({ url: image.url })) } }
          : undefined,
      },
      include: { location: true, activityMasterImages: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "ActivityMaster",
      entityId: row.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, locationId: row.locationId },
    });

    return NextResponse.json(format(row), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_ACTIVITIES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
