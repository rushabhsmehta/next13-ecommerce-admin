import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import {
  hasOverlappingPeriods,
  upsertPricingWithSplit,
} from "@/lib/hotel-pricing-overlap";
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

    // Build the filter based on available parameters
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        AND: [
          { startDate: { lte: dateToUtc(endDate)! } },
          { endDate: { gte: dateToUtc(startDate)! } }
        ]
      };
    }

    const hotelPricing = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.hotelId,
        isActive: true,
        ...dateFilter
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
      applySplit,
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

    if (applySplit) {
      const result = await prismadb.$transaction(async (tx) =>
        upsertPricingWithSplit(tx, {
          hotelId: params.hotelId,
          startDate: newStart,
          endDate: newEnd,
          roomTypeId,
          occupancyTypeId,
          mealPlanId: mealPlanId || null,
          price,
          locationSeasonalPeriodId: locationSeasonalPeriodId || null,
          isActive: true,
        })
      );
      return NextResponse.json(result);
    }

    const overlaps = await prismadb.$transaction((tx) =>
      hasOverlappingPeriods(tx, {
        hotelId: params.hotelId,
        roomTypeId,
        occupancyTypeId,
        mealPlanId: mealPlanId || null,
        startDate: newStart,
        endDate: newEnd,
      })
    );
    if (overlaps) {
      return NextResponse.json(
        {
          message:
            "Overlapping pricing period exists. Set applySplit to true or adjust dates.",
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