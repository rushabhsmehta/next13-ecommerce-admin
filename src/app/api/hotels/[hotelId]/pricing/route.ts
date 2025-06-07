import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { ROOM_TYPES, OCCUPANCY_TYPES, MEAL_PLANS } from "@/lib/constants";

// GET hotel pricing for a specific hotelId
export async function GET(
  req: Request,
  { params }: { params: { hotelId: string } }
) {
  try {
    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }

    // Get query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");    // Build the filter based on available parameters
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        AND: [
          { startDate: { lte: new Date(new Date(endDate).toISOString()) } },
          { endDate: { gte: new Date(new Date(startDate).toISOString()) } }
        ]
      };
    }const hotelPricing = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.hotelId,
        isActive: true,
        ...dateFilter
      },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true
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
export async function POST(
  req: Request,
  { params }: { params: { hotelId: string } }
) {
  try {
    const { userId } = auth();
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
    }    // Create the hotel pricing record
    const hotelPricing = await prismadb.hotelPricing.create({
      data: {
        hotelId: params.hotelId,
        startDate: new Date(new Date(startDate).toISOString()),
        endDate: new Date(new Date(endDate).toISOString()),
        roomTypeId,
        occupancyTypeId,
        price,
        mealPlanId: mealPlanId || null,
        isActive: true
      }
    });

    return NextResponse.json(hotelPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}