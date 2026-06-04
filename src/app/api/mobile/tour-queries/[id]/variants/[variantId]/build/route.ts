import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const extraBedSchema = z
  .object({
    occupancyTypeId: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(1).optional(),
  })
  .passthrough();

const roomAllocationSchema = z
  .object({
    roomTypeId: z.string().optional().nullable(),
    occupancyTypeId: z.string().optional().nullable(),
    mealPlanId: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(1).optional(),
    customRoomType: z.string().optional().nullable(),
    useCustomRoomType: z.boolean().optional(),
    guestNames: z.string().optional().nullable(),
    voucherNumber: z.string().optional().nullable(),
    extraBeds: z.array(extraBedSchema).optional(),
  })
  .passthrough();

const transportDetailSchema = z
  .object({
    vehicleTypeId: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(1).optional(),
    description: z.string().optional().nullable(),
  })
  .passthrough();

const patchSchema = z.object({
  roomsByItinerary: z.record(z.array(roomAllocationSchema)).optional(),
  transportByItinerary: z.record(z.array(transportDetailSchema)).optional(),
});

function asRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function findVariant(
  snapshots: Array<{ id: string; sourceVariantId: string | null; name: string; sortOrder: number | null }>,
  variantId: string
) {
  return snapshots.find(
    (variant) => variant.id === variantId || variant.sourceVariantId === variantId
  );
}

function variantStorageKey(variant: { id: string; sourceVariantId: string | null }) {
  return variant.sourceVariantId || variant.id;
}

function cleanRoomsByItinerary(
  value: Record<string, z.infer<typeof roomAllocationSchema>[]>,
  allowedItineraryIds: Set<string>
) {
  const next: Record<string, unknown[]> = {};
  for (const [itineraryId, rows] of Object.entries(value)) {
    if (!allowedItineraryIds.has(itineraryId)) continue;
    next[itineraryId] = rows.map((room) => ({
      ...room,
      roomTypeId: room.roomTypeId || "",
      occupancyTypeId: room.occupancyTypeId || "",
      mealPlanId: room.mealPlanId || "",
      quantity: room.quantity ?? 1,
      customRoomType: room.customRoomType || "",
      useCustomRoomType: Boolean(room.useCustomRoomType),
      guestNames: room.guestNames || "",
      voucherNumber: room.voucherNumber || "",
      extraBeds: (room.extraBeds ?? []).map((bed) => ({
        ...bed,
        occupancyTypeId: bed.occupancyTypeId || "",
        quantity: bed.quantity ?? 1,
      })),
    }));
  }
  return next;
}

function cleanTransportByItinerary(
  value: Record<string, z.infer<typeof transportDetailSchema>[]>,
  allowedItineraryIds: Set<string>
) {
  const next: Record<string, unknown[]> = {};
  for (const [itineraryId, rows] of Object.entries(value)) {
    if (!allowedItineraryIds.has(itineraryId)) continue;
    next[itineraryId] = rows.map((transport) => ({
      ...transport,
      vehicleTypeId: transport.vehicleTypeId || "",
      quantity: transport.quantity ?? 1,
      description: transport.description || "",
    }));
  }
  return next;
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const variantId = params.variantId?.trim();
    if (!id || !variantId) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid variant build payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        variantRoomAllocations: true,
        variantTransportDetails: true,
        itineraries: { select: { id: true } },
        queryVariantSnapshots: {
          select: {
            id: true,
            sourceVariantId: true,
            name: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const variant = findVariant(tpq.queryVariantSnapshots, variantId);
    if (!variant) return new NextResponse("Variant not found", { status: 404 });

    const key = variantStorageKey(variant);
    const allowedItineraryIds = new Set(tpq.itineraries.map((it) => it.id));
    const nextRooms = asRecord(tpq.variantRoomAllocations);
    const nextTransport = asRecord(tpq.variantTransportDetails);

    const data: Record<string, unknown> = {};
    if (parsed.data.roomsByItinerary !== undefined) {
      nextRooms[key] = cleanRoomsByItinerary(
        parsed.data.roomsByItinerary,
        allowedItineraryIds
      );
      data.variantRoomAllocations = nextRooms;
    }
    if (parsed.data.transportByItinerary !== undefined) {
      nextTransport[key] = cleanTransportByItinerary(
        parsed.data.transportByItinerary,
        allowedItineraryIds
      );
      data.variantTransportDetails = nextTransport;
    }

    if (Object.keys(data).length > 0) {
      await prismadb.tourPackageQuery.update({
        where: { id: tpq.id },
        data,
      });
    }

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: tpq.id,
      action: "UPDATE",
      metadata: {
        variantId,
        variantStorageKey: key,
        fields: Object.keys(data),
      },
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      variant: {
        id: variant.id,
        sourceVariantId: variant.sourceVariantId,
        name: variant.name,
        sortOrder: variant.sortOrder,
      },
      build: {
        variantRoomAllocations: nextRooms,
        variantTransportDetails: nextTransport,
      },
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_BUILD_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
