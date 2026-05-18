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
  label: z.string().min(1).max(200),
  imageUrl: z.string().url(),
  slug: z.string().max(200).optional().nullable(),
  tags: z.string().optional().nullable(),
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

    const location = await prismadb.location.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        label: true,
        imageUrl: true,
        slug: true,
        tags: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!location) return new NextResponse("Not found", { status: 404 });

    const [
      hotels,
      destinations,
      transportPricings,
      tourPackages,
      tourPackageQueries,
      inquiries,
    ] = await Promise.all([
      prismadb.hotel.count({ where: { locationId: params.id } }),
      prismadb.tourDestination.count({ where: { locationId: params.id } }),
      prismadb.transportPricing.count({ where: { locationId: params.id } }),
      prismadb.tourPackage.count({ where: { locationId: params.id } }),
      prismadb.tourPackageQuery.count({ where: { locationId: params.id } }),
      prismadb.inquiry.count({ where: { locationId: params.id } }),
    ]);

    return NextResponse.json({
      location: {
        ...location,
        createdAt: location.createdAt.toISOString(),
        updatedAt: location.updatedAt.toISOString(),
      },
      summary: {
        hotels,
        destinations,
        transportPricings,
        tourPackages,
        tourPackageQueries,
        inquiries,
        linkedCount:
          hotels +
          destinations +
          transportPricings +
          tourPackages +
          tourPackageQueries +
          inquiries,
      },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_GET]", error);
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
        { error: "Invalid location payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const location = await prismadb.location.update({
      where: { id: params.id },
      data: {
        label: v.label.trim(),
        imageUrl: v.imageUrl.trim(),
        slug: v.slug?.trim() || null,
        tags: v.tags?.trim() || null,
        ...(typeof v.isActive === "boolean" ? { isActive: v.isActive } : {}),
      } as any,
      select: { id: true, label: true, imageUrl: true, isActive: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Location",
      entityId: location.id,
      action: "UPDATE",
      metadata: { label: location.label },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_PATCH]", error);
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

    const [
      hotels,
      destinations,
      transportPricings,
      tourPackages,
      tourPackageQueries,
      inquiries,
    ] = await Promise.all([
      prismadb.hotel.count({ where: { locationId: params.id } }),
      prismadb.tourDestination.count({ where: { locationId: params.id } }),
      prismadb.transportPricing.count({ where: { locationId: params.id } }),
      prismadb.tourPackage.count({ where: { locationId: params.id } }),
      prismadb.tourPackageQuery.count({ where: { locationId: params.id } }),
      prismadb.inquiry.count({ where: { locationId: params.id } }),
    ]);
    const linked =
      hotels +
      destinations +
      transportPricings +
      tourPackages +
      tourPackageQueries +
      inquiries;

    if (linked > 0) {
      return NextResponse.json(
        {
          error: `Location has ${linked} linked record(s) (hotels, destinations, packages, etc.) and cannot be deleted.`,
        },
        { status: 409 }
      );
    }

    const location = await prismadb.location.delete({
      where: { id: params.id },
      select: { id: true, label: true },
    });

    await recordMobileAudit({
      userId,
      entityType: "Location",
      entityId: location.id,
      action: "DELETE",
      metadata: { label: location.label },
    });

    return NextResponse.json({ deleted: true, location });
  } catch (error) {
    console.log("[MOBILE_OPS_LOCATION_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
