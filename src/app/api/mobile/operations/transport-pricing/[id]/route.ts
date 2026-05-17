import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  locationId: z.string().min(1).optional(),
  vehicleTypeId: z.string().min(1).optional(),
  price: z.coerce.number().min(0).optional(),
  transportType: z.enum(["PerDay", "PerTrip"]).optional(),
  description: z.string().optional().nullable(),
  startDate: z.union([z.string(), z.date()]).optional(),
  endDate: z.union([z.string(), z.date()]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const transportPricing = await prismadb.transportPricing.findUnique({
      where: { id: params.id },
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
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
        vehicleType: { select: { id: true, name: true, description: true } },
      },
    });
    if (!transportPricing) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({
      transportPricing: {
        id: transportPricing.id,
        locationId: transportPricing.locationId,
        locationLabel: transportPricing.location.label,
        vehicleTypeId: transportPricing.vehicleTypeId,
        vehicleTypeName: transportPricing.vehicleType?.name ?? null,
        price: transportPricing.price,
        transportType: transportPricing.transportType,
        description: transportPricing.description,
        startDate: transportPricing.startDate.toISOString(),
        endDate: transportPricing.endDate.toISOString(),
        isActive: transportPricing.isActive,
        createdAt: transportPricing.createdAt.toISOString(),
        updatedAt: transportPricing.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_TRANSPORT_PRICING_DETAIL_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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
        { error: "Invalid transport pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (v.locationId !== undefined) updateData.locationId = v.locationId;
    if (v.vehicleTypeId !== undefined) updateData.vehicleTypeId = v.vehicleTypeId;
    if (v.price !== undefined) updateData.price = v.price;
    if (v.transportType !== undefined) updateData.transportType = v.transportType;
    if (v.description !== undefined) {
      updateData.description = v.description?.trim() || null;
    }
    if (v.startDate !== undefined) updateData.startDate = dateToUtc(v.startDate)!;
    if (v.endDate !== undefined) updateData.endDate = dateToUtc(v.endDate)!;
    if (v.isActive !== undefined) updateData.isActive = v.isActive;

    const transportPricing = await prismadb.transportPricing.update({
      where: { id: params.id },
      data: updateData as any,
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
      action: "UPDATE",
      metadata: {
        locationId: transportPricing.locationId,
        transportType: transportPricing.transportType,
      },
    });

    return NextResponse.json(transportPricing);
  } catch (error) {
    console.log("[MOBILE_OPS_TRANSPORT_PRICING_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const transportPricing = await prismadb.transportPricing.delete({
      where: { id: params.id },
      select: { id: true, locationId: true, transportType: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "TransportPricing",
      entityId: transportPricing.id,
      action: "DELETE",
      metadata: {
        locationId: transportPricing.locationId,
        transportType: transportPricing.transportType,
      },
    });

    return NextResponse.json({ deleted: true, transportPricing });
  } catch (error) {
    console.log("[MOBILE_OPS_TRANSPORT_PRICING_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
