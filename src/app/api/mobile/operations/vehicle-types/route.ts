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
  description: z.string().optional().nullable(),
});

/** Vehicle types — list + create. operations.read / .write. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const where: Record<string, unknown> = {};
    if (activeOnly) where.isActive = true;
    if (search) where.name = { contains: search };

    const [rows, total] = await Promise.all([
      prismadb.vehicleType.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      }),
      prismadb.vehicleType.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ items, total });
  } catch (error) {
    console.log("[MOBILE_OPS_VEHICLE_TYPES_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("VehicleType", key);
    if (prior) {
      const existing = await prismadb.vehicleType.findUnique({
        where: { id: prior },
        select: { id: true, name: true, isActive: true },
      });
      return NextResponse.json(
        { id: prior, vehicleType: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vehicle type payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const vehicleType = await prismadb.vehicleType.create({
      data: {
        name: v.name.trim(),
        description: v.description?.trim() || null,
      } as any,
      select: { id: true, name: true, description: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "VehicleType",
      entityId: vehicleType.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, name: vehicleType.name },
    });

    return NextResponse.json(vehicleType, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_VEHICLE_TYPES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
