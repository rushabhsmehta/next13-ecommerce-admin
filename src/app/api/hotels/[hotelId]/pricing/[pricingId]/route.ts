import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

// GET a specific pricing period
export async function GET(
  req: Request,
  { params }: { params: { hotelId: string; pricingId: string } }
) {
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
        mealPlan: true
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
  { params }: { params: { hotelId: string; pricingId: string } }
) {
  try {
    const { userId } = auth();
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
      mealPlanId 
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
    }    // Update the hotel pricing record
    const updatedPricing = await prismadb.hotelPricing.update({
      where: {
        id: params.pricingId,
        hotelId: params.hotelId
      },
      data: {        startDate: dateToUtc(startDate)!,
        endDate: dateToUtc(endDate)!,
        roomTypeId,
        occupancyTypeId,
        price,
        mealPlanId: mealPlanId || null,
        isActive: true
      }
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
  { params }: { params: { hotelId: string; pricingId: string } }
) {
  try {
    const { userId } = auth();
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