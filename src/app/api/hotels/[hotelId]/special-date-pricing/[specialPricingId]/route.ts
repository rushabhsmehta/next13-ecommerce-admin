import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { findOverlappingSpecialDatePricings } from "@/lib/hotel-effective-pricing";

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

function serialize(row: {
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
  roomType?: { id: string; name: string } | null;
  occupancyType?: { id: string; name: string } | null;
  mealPlan?: { id: string; name: string; code: string } | null;
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
    occupancyTypeId: row.occupancyTypeId,
    mealPlanId: row.mealPlanId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    roomType: row.roomType ?? null,
    occupancyType: row.occupancyType ?? null,
    mealPlan: row.mealPlan ?? null,
  };
}

async function findRow(hotelId: string, specialPricingId: string) {
  return prismadb.hotelSpecialDatePricing.findFirst({
    where: { id: specialPricingId, hotelId },
    include: {
      roomType: { select: { id: true, name: true } },
      occupancyType: { select: { id: true, name: true } },
      mealPlan: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function GET(
  req: Request,
  props: { params: Promise<{ hotelId: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const row = await findRow(params.hotelId, params.specialPricingId);
    if (!row) {
      return new NextResponse("Special date pricing not found", { status: 404 });
    }

    return NextResponse.json(serialize(row));
  } catch (error) {
    console.error("[HOTEL_SPECIAL_DATE_PRICING_GET_ONE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ hotelId: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existing = await findRow(params.hotelId, params.specialPricingId);
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

    const startDate = dateToUtc(parsed.data.startDate);
    const endDate = dateToUtc(parsed.data.endDate);
    if (!startDate || !endDate) {
      return new NextResponse("Invalid date format", { status: 400 });
    }
    if (endDate < startDate) {
      return new NextResponse("End date must be on or after start date", {
        status: 400,
      });
    }

    const mealPlanId = parsed.data.mealPlanId || null;
    const overlaps = await prismadb.$transaction((tx) =>
      findOverlappingSpecialDatePricings(tx, {
        hotelId: params.hotelId,
        roomTypeId: parsed.data.roomTypeId,
        occupancyTypeId: parsed.data.occupancyTypeId,
        mealPlanId,
        startDate,
        endDate,
        excludeId: params.specialPricingId,
      })
    );
    if (overlaps.length > 0) {
      return NextResponse.json(
        {
          message:
            "Special date pricing overlaps an existing special date price for the same room, occupancy, and meal plan.",
          conflicts: overlaps.map((row) => serialize(row)),
        },
        { status: 409 }
      );
    }

    const updated = await prismadb.hotelSpecialDatePricing.update({
      where: { id: params.specialPricingId },
      data: {
        name: parsed.data.name.trim(),
        startDate,
        endDate,
        roomTypeId: parsed.data.roomTypeId,
        occupancyTypeId: parsed.data.occupancyTypeId,
        mealPlanId,
        price: parsed.data.price,
        notes: parsed.data.notes?.trim() || null,
        isActive: parsed.data.isActive ?? existing.isActive,
      },
      include: {
        roomType: { select: { id: true, name: true } },
        occupancyType: { select: { id: true, name: true } },
        mealPlan: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(serialize(updated));
  } catch (error) {
    console.error("[HOTEL_SPECIAL_DATE_PRICING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ hotelId: string; specialPricingId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const existing = await findRow(params.hotelId, params.specialPricingId);
    if (!existing) {
      return new NextResponse("Special date pricing not found", { status: 404 });
    }

    await prismadb.hotelSpecialDatePricing.update({
      where: { id: params.specialPricingId },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[HOTEL_SPECIAL_DATE_PRICING_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
