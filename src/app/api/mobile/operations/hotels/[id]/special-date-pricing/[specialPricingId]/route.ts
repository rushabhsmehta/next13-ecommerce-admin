import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { findOverlappingSpecialDatePricings } from "@/lib/hotel-effective-pricing";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const specialDatePricingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  roomTypeId: z.string().min(1, "Room type is required"),
  occupancyTypeId: z.string().min(1, "Occupancy type is required"),
  mealPlanId: z.string().nullable().optional(),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const rowSelect = {
  id: true,
  hotelId: true,
  name: true,
  startDate: true,
  endDate: true,
  price: true,
  notes: true,
  isActive: true,
  roomTypeId: true,
  occupancyTypeId: true,
  mealPlanId: true,
  createdAt: true,
  updatedAt: true,
  roomType: { select: { id: true, name: true } },
  occupancyType: { select: { id: true, name: true } },
  mealPlan: { select: { id: true, name: true, code: true } },
} as const;

function formatRow(row: {
  id: string;
  hotelId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  price: number;
  notes: string | null;
  isActive: boolean;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  createdAt: Date;
  updatedAt: Date;
  roomType: { id: string; name: string } | null;
  occupancyType: { id: string; name: string } | null;
  mealPlan: { id: string; name: string; code: string } | null;
}) {
  return {
    id: row.id,
    hotelId: row.hotelId,
    name: row.name,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    price: row.price,
    notes: row.notes,
    isActive: row.isActive,
    roomTypeId: row.roomTypeId,
    roomTypeName: row.roomType?.name ?? null,
    occupancyTypeId: row.occupancyTypeId,
    occupancyTypeName: row.occupancyType?.name ?? null,
    mealPlanId: row.mealPlanId,
    mealPlanName: row.mealPlan?.name ?? null,
    mealPlanCode: row.mealPlan?.code ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findRow(hotelId: string, specialPricingId: string) {
  return prismadb.hotelSpecialDatePricing.findFirst({
    where: { id: specialPricingId, hotelId },
    select: rowSelect,
  });
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.specialPricingId) {
      return new NextResponse("Missing special date pricing id", { status: 400 });
    }

    const [hotel, row] = await Promise.all([
      prismadb.hotel.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, locationId: true },
      }),
      findRow(params.id, params.specialPricingId),
    ]);
    if (!hotel) return new NextResponse("Hotel not found", { status: 404 });
    if (!row) {
      return new NextResponse("Special date pricing not found", { status: 404 });
    }

    return NextResponse.json({ hotel, specialDatePricing: formatRow(row) });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_SPECIAL_DATE_PRICING_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.specialPricingId) {
      return new NextResponse("Missing special date pricing id", { status: 400 });
    }

    const existing = await findRow(params.id, params.specialPricingId);
    if (!existing) {
      return new NextResponse("Special date pricing not found", { status: 404 });
    }

    const parsed = specialDatePricingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid special date pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const startDate = dateToUtc(v.startDate);
    const endDate = dateToUtc(v.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }

    const mealPlanId = v.mealPlanId || null;
    const conflicts = await prismadb.$transaction((tx) =>
      findOverlappingSpecialDatePricings(tx, {
        hotelId: params.id,
        roomTypeId: v.roomTypeId,
        occupancyTypeId: v.occupancyTypeId,
        mealPlanId,
        startDate,
        endDate,
        excludeId: params.specialPricingId,
      })
    );
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error:
            "Special date pricing overlaps an existing special date price for the same room, occupancy, and meal plan.",
          conflicts: conflicts.map((row) => ({
            ...row,
            startDate: row.startDate.toISOString(),
            endDate: row.endDate.toISOString(),
          })),
        },
        { status: 409 }
      );
    }

    const row = await prismadb.hotelSpecialDatePricing.update({
      where: { id: params.specialPricingId },
      data: {
        name: v.name.trim(),
        startDate,
        endDate,
        roomTypeId: v.roomTypeId,
        occupancyTypeId: v.occupancyTypeId,
        mealPlanId,
        price: v.price,
        notes: v.notes?.trim() || null,
        isActive: v.isActive ?? existing.isActive,
      },
      select: rowSelect,
    });

    await recordMobileAudit({
      userId,
      entityType: "HotelSpecialDatePricing",
      entityId: row.id,
      action: "UPDATE",
      metadata: { hotelId: params.id },
    });

    return NextResponse.json(formatRow(row));
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_SPECIAL_DATE_PRICING_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.specialPricingId) {
      return new NextResponse("Missing special date pricing id", { status: 400 });
    }

    const existing = await findRow(params.id, params.specialPricingId);
    if (!existing) {
      return new NextResponse("Special date pricing not found", { status: 404 });
    }

    await prismadb.hotelSpecialDatePricing.update({
      where: { id: params.specialPricingId },
      data: { isActive: false },
    });
    await recordMobileAudit({
      userId,
      entityType: "HotelSpecialDatePricing",
      entityId: params.specialPricingId,
      action: "DELETE",
      metadata: { hotelId: params.id },
    });

    return NextResponse.json({ deleted: true, specialDatePricing: formatRow(existing) });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_SPECIAL_DATE_PRICING_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
