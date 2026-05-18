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

const updateSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  gstNumber: z.string().max(30).optional().nullable(),
  address: z.string().max(2000).optional().nullable(),
});

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const supplier = await prismadb.supplier.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        gstNumber: true,
        address: true,
      },
    });
    if (!supplier) return new NextResponse("Not found", { status: 404 });

    const [purchaseCount, recent] = await Promise.all([
      prismadb.purchaseDetail.count({ where: { supplierId: params.id } }),
      prismadb.purchaseDetail.findMany({
        where: { supplierId: params.id },
        select: {
          id: true,
          billNumber: true,
          price: true,
          gstAmount: true,
          purchaseDate: true,
        },
        orderBy: { purchaseDate: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      supplier,
      summary: { purchaseCount },
      recentPurchases: recent,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_SUPPLIER_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid supplier payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const supplier = await prismadb.supplier.update({
      where: { id: params.id },
      data: {
        name: v.name.trim(),
        contact: v.contact?.trim() || null,
        email: v.email && v.email.trim() ? v.email.trim() : null,
        gstNumber: v.gstNumber?.trim() || null,
        address: v.address?.trim() || null,
      },
      select: { id: true, name: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Supplier",
      entityId: supplier.id,
      action: "UPDATE",
      metadata: { name: supplier.name },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.log("[MOBILE_OPS_SUPPLIER_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    // Don't orphan financial history — block delete when purchases exist.
    const linked = await prismadb.purchaseDetail.count({
      where: { supplierId: params.id },
    });
    if (linked > 0) {
      return NextResponse.json(
        {
          error: `Supplier has ${linked} linked purchase(s) and cannot be deleted.`,
        },
        { status: 409 }
      );
    }

    const supplier = await prismadb.supplier.delete({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Supplier",
      entityId: supplier.id,
      action: "DELETE",
      metadata: { name: supplier.name },
    });

    return NextResponse.json({ deleted: true, supplier });
  } catch (error) {
    console.log("[MOBILE_OPS_SUPPLIER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
