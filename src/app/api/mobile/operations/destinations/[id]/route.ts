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
  locationId: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
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

    const destination = await prismadb.tourDestination.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        locationId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
      },
    });
    if (!destination) return new NextResponse("Not found", { status: 404 });

    const hotelCount = await prismadb.hotel.count({
      where: { destinationId: params.id },
    });

    return NextResponse.json({
      destination: {
        id: destination.id,
        name: destination.name,
        description: destination.description,
        imageUrl: destination.imageUrl,
        locationId: destination.locationId,
        locationLabel: destination.location.label,
        isActive: destination.isActive,
        createdAt: destination.createdAt.toISOString(),
        updatedAt: destination.updatedAt.toISOString(),
      },
      summary: { hotelCount },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_DESTINATION_GET]", error);
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

    const destination = await prismadb.tourDestination.update({
      where: { id: params.id },
      data: {
        name: v.name.trim(),
        locationId: v.locationId,
        description: v.description?.trim() || null,
        imageUrl:
          v.imageUrl && typeof v.imageUrl === "string" && v.imageUrl.trim()
            ? v.imageUrl.trim()
            : null,
        ...(typeof v.isActive === "boolean" ? { isActive: v.isActive } : {}),
      } as any,
      select: { id: true, name: true, locationId: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourDestination",
      entityId: destination.id,
      action: "UPDATE",
      metadata: { name: destination.name, locationId: destination.locationId },
    });

    return NextResponse.json(destination);
  } catch (error) {
    console.log("[MOBILE_OPS_DESTINATION_PATCH]", error);
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

    const hotelCount = await prismadb.hotel.count({
      where: { destinationId: params.id },
    });
    if (hotelCount > 0) {
      return NextResponse.json(
        {
          error: `Destination has ${hotelCount} linked hotel(s) and cannot be deleted.`,
        },
        { status: 409 }
      );
    }

    const destination = await prismadb.tourDestination.delete({
      where: { id: params.id },
      select: { id: true, name: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourDestination",
      entityId: destination.id,
      action: "DELETE",
      metadata: { name: destination.name },
    });

    return NextResponse.json({ deleted: true, destination });
  } catch (error) {
    console.log("[MOBILE_OPS_DESTINATION_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
