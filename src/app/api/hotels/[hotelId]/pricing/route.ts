import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { findOverlappingBasePricings } from "@/lib/hotel-effective-pricing";
import { dateToUtc } from '@/lib/timezone-utils';

// GET hotel pricing for a specific hotelId
export async function GET(req: Request, props: { params: Promise<{ hotelId: string }> }) {
  const params = await props.params;
  try {
    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });    }

    // Get query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const roomTypeId = url.searchParams.get("roomTypeId");
    const occupancyTypeId = url.searchParams.get("occupancyTypeId");
    const mealPlanId = url.searchParams.get("mealPlanId");

    // Build the filter based on available parameters
    const filters: Record<string, unknown> = {};
    if (startDate && endDate) {
      const start = dateToUtc(startDate);
      const end = dateToUtc(endDate);
      if (!start || !end) {
        return new NextResponse("Invalid date format", { status: 400 });
      }
      filters.AND = [
        { startDate: { lte: end } },
        { endDate: { gte: start } }
      ];
    }
    if (roomTypeId) filters.roomTypeId = roomTypeId;
    if (occupancyTypeId) filters.occupancyTypeId = occupancyTypeId;
    if (url.searchParams.has("mealPlanId")) filters.mealPlanId = mealPlanId || null;

    const hotelPricing = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.hotelId,
        isActive: true,
        ...filters
      },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
        locationSeasonalPeriod: true,
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    return NextResponse.json(hotelPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST to create new hotel pricing
export async function POST(req: Request, props: { params: Promise<{ hotelId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }    const body = await req.json();
    const { 
      startDate, 
      endDate, 
      roomTypeId, 
      occupancyTypeId, 
      price,
      mealPlanId,
      locationSeasonalPeriodId,
    } = body;

    if (!startDate || !endDate) {
      return new NextResponse("Start date and end date are required", { status: 400 });
    }

    if (!roomTypeId || !occupancyTypeId) {
      return new NextResponse("Room type and occupancy type are required", { status: 400 });
    }

    if (typeof price !== "number" || price < 0) {
      return new NextResponse("Valid price is required", { status: 400 });
    }

    // Check if the hotel exists
    const hotel = await prismadb.hotel.findUnique({
      where: {
        id: params.hotelId
      }
    });

    if (!hotel) {
      return new NextResponse("Hotel not found", { status: 404 });
    }

    const newStart = dateToUtc(startDate);
    const newEnd = dateToUtc(endDate);

    if (!newStart || !newEnd) {
      return new NextResponse("Invalid date format", { status: 400 });
    }

    const overlaps = await prismadb.$transaction((tx) =>
      findOverlappingBasePricings(tx, {
        hotelId: params.hotelId,
        roomTypeId,
        occupancyTypeId,
        mealPlanId: mealPlanId || null,
        startDate: newStart,
        endDate: newEnd,
      })
    );
    if (overlaps.length > 0) {
      return NextResponse.json(
        {
          message:
            "Overlapping pricing period exists for the same room, occupancy, and meal plan. Add Special Date Pricing for event/holiday overrides, or adjust the normal pricing dates.",
          conflicts: overlaps,
        },
        { status: 409 }
      );
    }

    // Create the hotel pricing record without splitting
    const hotelPricing = await prismadb.hotelPricing.create({
      data: {
        hotelId: params.hotelId,
        startDate: newStart,
        endDate: newEnd,
        roomTypeId,
        occupancyTypeId,
        price,
        mealPlanId: mealPlanId || null,
        locationSeasonalPeriodId: locationSeasonalPeriodId || null,
        isActive: true
      }
    });

    return NextResponse.json(hotelPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
