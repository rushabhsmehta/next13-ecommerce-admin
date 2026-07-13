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

export async function GET(
  req: Request,
  props: { params: Promise<{ hotelId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const activeOnly = url.searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = { hotelId: params.hotelId };
    if (activeOnly) where.isActive = true;

    if (startDate && endDate) {
      const start = dateToUtc(startDate);
      const end = dateToUtc(endDate);
      if (!start || !end) {
        return new NextResponse("Invalid date format", { status: 400 });
      }
      where.AND = [{ startDate: { lte: end } }, { endDate: { gte: start } }];
    }

    const rows = await prismadb.hotelSpecialDatePricing.findMany({
      where,
      include: {
        roomType: { select: { id: true, name: true } },
        occupancyType: { select: { id: true, name: true } },
        mealPlan: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ startDate: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    console.error("[HOTEL_SPECIAL_DATE_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ hotelId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }

    const parsed = specialDatePricingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid special date pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const hotel = await prismadb.hotel.findUnique({
      where: { id: params.hotelId },
      select: { id: true },
    });
    if (!hotel) {
      return new NextResponse("Hotel not found", { status: 404 });
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

    const created = await prismadb.hotelSpecialDatePricing.create({
      data: {
        hotelId: params.hotelId,
        name: parsed.data.name.trim(),
        startDate,
        endDate,
        roomTypeId: parsed.data.roomTypeId,
        occupancyTypeId: parsed.data.occupancyTypeId,
        mealPlanId,
        price: parsed.data.price,
        notes: parsed.data.notes?.trim() || null,
        isActive: parsed.data.isActive ?? true,
      },
      include: {
        roomType: { select: { id: true, name: true } },
        occupancyType: { select: { id: true, name: true } },
        mealPlan: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(serialize(created), { status: 201 });
  } catch (error) {
    console.error("[HOTEL_SPECIAL_DATE_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
