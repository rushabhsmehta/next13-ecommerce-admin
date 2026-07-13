import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { findOverlappingBasePricings } from "@/lib/hotel-effective-pricing";
import { dateToUtc } from '@/lib/timezone-utils';

// GET a specific pricing period
export async function GET(
  req: Request,
  props: { params: Promise<{ hotelId: string; pricingId: string }> }
) {
  const params = await props.params;
  try {
    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
    }

    const pricingPeriod = await prismadb.hotelPricing.findUnique({
      where: {
        id: params.pricingId,
        hotelId: params.hotelId
      },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
        locationSeasonalPeriod: true,
      }
    });

    if (!pricingPeriod) {
      return new NextResponse("Pricing period not found", { status: 404 });
    }

    return NextResponse.json(pricingPeriod);
  } catch (error) {
    console.error("[HOTEL_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// UPDATE a pricing period
export async function PATCH(
  req: Request,
  props: { params: Promise<{ hotelId: string; pricingId: string }> }
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

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
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

    if (newEnd < newStart) {
      return new NextResponse("End date must be on or after start date", { status: 400 });
    }

    const overlaps = await prismadb.$transaction((tx) =>
      findOverlappingBasePricings(tx, {
        hotelId: params.hotelId,
        roomTypeId,
        occupancyTypeId,
        mealPlanId: mealPlanId || null,
        startDate: newStart,
        endDate: newEnd,
        excludeId: params.pricingId,
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

    const updatedPricing = await prismadb.hotelPricing.update({
      where: {
        id: params.pricingId,
        hotelId: params.hotelId
      },
      data: {
        startDate: newStart,
        endDate: newEnd,
        roomTypeId,
        occupancyTypeId,
        price,
        mealPlanId: mealPlanId || null,
        locationSeasonalPeriodId: locationSeasonalPeriodId ?? null,
        isActive: true
      },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
        locationSeasonalPeriod: true,
      },
    });

    return NextResponse.json(updatedPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE a pricing period
export async function DELETE(
  req: Request,
  props: { params: Promise<{ hotelId: string; pricingId: string }> }
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

    if (!params.pricingId) {
      return new NextResponse("Pricing ID is required", { status: 400 });
    }

    // Check if pricing period exists
    const pricingPeriod = await prismadb.hotelPricing.findUnique({
      where: {
        id: params.pricingId,
        hotelId: params.hotelId
      }
    });

    if (!pricingPeriod) {
      return new NextResponse("Pricing period not found", { status: 404 });
    }

    // Delete the pricing period
    await prismadb.hotelPricing.delete({
      where: {
        id: params.pricingId
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[HOTEL_PRICING_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
