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

const relationSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  supplierId: z.string().min(1, "Supplier is required"),
});

function format(row: any) {
  return {
    id: row.id,
    locationId: row.locationId,
    locationLabel: row.location?.label ?? null,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    supplierContact: row.supplier?.contact ?? null,
    supplierEmail: row.supplier?.email ?? null,
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
    const view = searchParams.get("view") === "supplier" ? "supplier" : "location";
    const rows = await prismadb.supplierLocation.findMany({
      include: {
        location: { select: { id: true, label: true } },
        supplier: { select: { id: true, name: true, contact: true, email: true } },
      },
      orderBy:
        view === "supplier"
          ? [{ supplier: { name: "asc" } }, { location: { label: "asc" } }]
          : [{ location: { label: "asc" } }, { supplier: { name: "asc" } }],
    });

    return NextResponse.json({ items: rows.map(format), total: rows.length, view });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_SUPPLIERS_GET]", error);
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
    const prior = await findPriorIdempotentEntityId("SupplierLocation", key);
    if (prior) {
      const existing = await prismadb.supplierLocation.findUnique({
        where: { id: prior },
        include: { location: true, supplier: true },
      });
      return NextResponse.json({ id: prior, relation: existing ? format(existing) : null, idempotentReplay: true });
    }

    const parsed = relationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid location supplier payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const row = await prismadb.supplierLocation.upsert({
      where: { supplierId_locationId: { supplierId: v.supplierId, locationId: v.locationId } },
      create: { supplierId: v.supplierId, locationId: v.locationId },
      update: {},
      include: { location: true, supplier: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "SupplierLocation",
      entityId: row.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        locationId: row.locationId,
        supplierId: row.supplierId,
      },
    });

    return NextResponse.json(format(row), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_SUPPLIERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
