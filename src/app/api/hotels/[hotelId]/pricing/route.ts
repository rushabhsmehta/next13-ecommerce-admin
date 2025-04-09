import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

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
    const endDate = url.searchParams.get("endDate");

    // Build the filter based on available parameters
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        AND: [
          { startDate: { lte: new Date(endDate) } },
          { endDate: { gte: new Date(startDate) } }
        ]
      };
    }

    const hotelPricing = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.hotelId,
        isActive: true,
        ...dateFilter
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
    }

    const body = await req.json();
    const { 
      startDate, 
      endDate, 
      roomType, 
      occupancyType, 
      price, 
      mealPlan 
    } = body;

    if (!startDate || !endDate) {
      return new NextResponse("Start date and end date are required", { status: 400 });
    }

    if (!roomType || !occupancyType) {
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

    // Create the hotel pricing record
    const hotelPricing = await prismadb.hotelPricing.create({
      data: {
        hotelId: params.hotelId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        roomType,
        occupancyType,
        price,
        mealPlan: mealPlan || null,
        isActive: true
      }
    });

    return NextResponse.json(hotelPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}