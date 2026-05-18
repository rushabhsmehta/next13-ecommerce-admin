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
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const vehicleType = await prismadb.vehicleType.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!vehicleType) return new NextResponse("Not found", { status: 404 });

    const [transportPricingsCount, transportDetailsCount] = await Promise.all([
      prismadb.transportPricing.count({ where: { vehicleTypeId: params.id } }),
      prismadb.transportDetail.count({ where: { vehicleTypeId: params.id } }),
    ]);

    return NextResponse.json({
      vehicleType: {
        ...vehicleType,
        createdAt: vehicleType.createdAt.toISOString(),
        updatedAt: vehicleType.updatedAt.toISOString(),
      },
      summary: {
        transportPricingsCount,
        transportDetailsCount,
        usageCount: transportPricingsCount + transportDetailsCount,
      },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_VEHICLE_TYPE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vehicle type payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    if (!v.name && v.description === undefined && v.isActive === undefined) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 422 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (v.name !== undefined) updateData.name = v.name.trim();
    if (v.description !== undefined) {
      updateData.description = v.description?.trim() || null;
    }
    if (v.isActive !== undefined) updateData.isActive = v.isActive;

    const vehicleType = await prismadb.vehicleType.update({
      where: { id: params.id },
      data: updateData as any,
      select: { id: true, name: true, description: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "VehicleType",
      entityId: vehicleType.id,
      action: "UPDATE",
      metadata: { name: vehicleType.name, isActive: vehicleType.isActive },
    });

    return NextResponse.json(vehicleType);
  } catch (error) {
    console.log("[MOBILE_OPS_VEHICLE_TYPE_PATCH]", error);
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
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const [transportDetailsCount, transportPricingsCount] = await Promise.all([
      prismadb.transportDetail.count({ where: { vehicleTypeId: params.id } }),
      prismadb.transportPricing.count({ where: { vehicleTypeId: params.id } }),
    ]);
    const usageCount = transportDetailsCount + transportPricingsCount;

    if (usageCount > 0) {
      const vehicleType = await prismadb.vehicleType.update({
        where: { id: params.id },
        data: { isActive: false },
        select: { id: true, name: true, isActive: true },
      });
      await recordMobileAudit({
        userId,
        entityType: "VehicleType",
        entityId: vehicleType.id,
        action: "UPDATE",
        metadata: {
          softDelete: true,
          reason: "in use",
          usageCount,
        },
      });
      return NextResponse.json({ deactivated: true, vehicleType });
    }

    const vehicleType = await prismadb.vehicleType.delete({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "VehicleType",
      entityId: vehicleType.id,
      action: "DELETE",
      metadata: { name: vehicleType.name },
    });

    return NextResponse.json({ deleted: true, vehicleType });
  } catch (error) {
    console.log("[MOBILE_OPS_VEHICLE_TYPE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
