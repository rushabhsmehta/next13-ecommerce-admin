import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
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
  locationId: z.string().min(1, "Location is required"),
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  transportType: z.enum(["PerDay", "PerTrip"], {
    required_error: "Transport type is required",
  }),
  description: z.string().optional().nullable(),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  isActive: z.boolean().optional(),
});

/** Transport pricing — list + create. operations.read / .write. */
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
            { transportType: { contains: search } },
            { description: { contains: search } },
            { location: { label: { contains: search } } },
            { vehicleType: { name: { contains: search } } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prismadb.transportPricing.findMany({
        where,
        select: {
          id: true,
          locationId: true,
          vehicleTypeId: true,
          price: true,
          transportType: true,
          description: true,
          startDate: true,
          endDate: true,
          isActive: true,
          location: { select: { id: true, label: true } },
          vehicleType: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.transportPricing.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      locationId: r.locationId,
      locationLabel: r.location.label,
      vehicleTypeId: r.vehicleTypeId,
      vehicleTypeName: r.vehicleType?.name ?? null,
      price: r.price,
      transportType: r.transportType,
      description: r.description,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      isActive: r.isActive,
    }));

    return NextResponse.json({
      items,
      total,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_TRANSPORT_PRICING_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("TransportPricing", key);
    if (prior) {
      const existing = await prismadb.transportPricing.findUnique({
        where: { id: prior },
        select: { id: true, locationId: true, price: true, transportType: true },
      });
      return NextResponse.json(
        { id: prior, transportPricing: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid transport pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const transportPricing = await prismadb.transportPricing.create({
      data: {
        locationId: v.locationId,
        vehicleTypeId: v.vehicleTypeId,
        price: v.price,
        transportType: v.transportType,
        description: v.description?.trim() || null,
        startDate: dateToUtc(v.startDate)!,
        endDate: dateToUtc(v.endDate)!,
        isActive: v.isActive ?? true,
      } as any,
      select: {
        id: true,
        locationId: true,
        vehicleTypeId: true,
        price: true,
        transportType: true,
        isActive: true,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TransportPricing",
      entityId: transportPricing.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        locationId: transportPricing.locationId,
        transportType: transportPricing.transportType,
      },
    });

    return NextResponse.json(transportPricing, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_TRANSPORT_PRICING_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
