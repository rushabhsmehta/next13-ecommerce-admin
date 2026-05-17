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
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const row = await prismadb.activityMaster.findUnique({
      where: { id: params.id },
      include: { location: true, activityMasterImages: true },
    });
    if (!row) return new NextResponse("Activity not found", { status: 404 });
    return NextResponse.json(format(row));
  } catch (error) {
    console.log("[MOBILE_OPS_ACTIVITY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const parsed = activitySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid activity payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;
    const existing = await prismadb.activityMaster.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return new NextResponse("Activity not found", { status: 404 });

    const row = await prismadb.activityMaster.update({
      where: { id: params.id },
      data: {
        locationId: v.locationId,
        activityMasterTitle: v.activityMasterTitle,
        activityMasterDescription: v.activityMasterDescription,
        itineraryId: v.itineraryId || null,
        activityMasterImages: {
          deleteMany: {},
          ...(v.images?.length
            ? { createMany: { data: v.images.map((image) => ({ url: image.url })) } }
            : {}),
        },
      },
      include: { location: true, activityMasterImages: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "ActivityMaster",
      entityId: row.id,
      action: "UPDATE",
      metadata: { locationId: row.locationId },
    });

    return NextResponse.json(format(row));
  } catch (error) {
    console.log("[MOBILE_OPS_ACTIVITY_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.activityMaster.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!existing) return new NextResponse("Activity not found", { status: 404 });
    await prismadb.activityMaster.delete({ where: { id: params.id } });
    await recordMobileAudit({
      userId,
      entityType: "ActivityMaster",
      entityId: params.id,
      action: "DELETE",
    });
    return NextResponse.json({ deleted: true, activity: existing });
  } catch (error) {
    console.log("[MOBILE_OPS_ACTIVITY_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
