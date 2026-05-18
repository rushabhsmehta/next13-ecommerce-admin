import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

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

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    const row = await prismadb.supplierLocation.findUnique({
      where: { id: params.id },
      include: { location: true, supplier: true },
    });
    if (!row) return new NextResponse("Relationship not found", { status: 404 });
    return NextResponse.json(format(row));
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_SUPPLIER_GET]", error);
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
    const row = await prismadb.supplierLocation.findUnique({
      where: { id: params.id },
      select: { id: true, locationId: true, supplierId: true },
    });
    if (!row) return new NextResponse("Relationship not found", { status: 404 });
    await prismadb.supplierLocation.delete({ where: { id: params.id } });
    await recordMobileAudit({
      userId,
      entityType: "SupplierLocation",
      entityId: params.id,
      action: "DELETE",
      metadata: { locationId: row.locationId, supplierId: row.supplierId },
    });
    return NextResponse.json({ deleted: true, relation: row });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_SUPPLIER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
