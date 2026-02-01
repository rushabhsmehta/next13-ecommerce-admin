import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { ROOM_TYPES, OCCUPANCY_TYPES, MEAL_PLANS } from "@/lib/constants";
import { dateToUtc } from '@/lib/timezone-utils';

// GET hotel pricing for a specific hotelId
export async function GET(
  req: Request,
  { params }: { params: { hotelId: string } }
) {
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
      mealPlanId,
      applySplit 
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

    // If applySplit is true, handle period splitting
    if (applySplit) {
      // Find overlapping pricing periods
      const overlappingPeriods = await prismadb.hotelPricing.findMany({
        where: {
          hotelId: params.hotelId,
          roomTypeId,
          occupancyTypeId,
          mealPlanId: mealPlanId || null,
          isActive: true,
          AND: [
            { startDate: { lte: newEnd } },
            { endDate: { gte: newStart } }
          ]
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      // Use a transaction to handle all updates atomically
      const result = await prismadb.$transaction(async (tx) => {
        // For each overlapping period, split it
        for (const period of overlappingPeriods) {
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);

          // Delete the original period
          await tx.hotelPricing.delete({
            where: { id: period.id }
          });

          // Create before segment if exists
          if (periodStart < newStart) {
            const beforeEnd = new Date(newStart);
            beforeEnd.setDate(beforeEnd.getDate() - 1);
            await tx.hotelPricing.create({
              data: {
                hotelId: params.hotelId,
                startDate: periodStart,
                endDate: beforeEnd,
                roomTypeId: period.roomTypeId,
                occupancyTypeId: period.occupancyTypeId,
                price: period.price,
                mealPlanId: period.mealPlanId,
                isActive: true
              }
            });
          }

          // Create after segment if exists
          if (periodEnd > newEnd) {
            const afterStart = new Date(newEnd);
            afterStart.setDate(afterStart.getDate() + 1);
            await tx.hotelPricing.create({
              data: {
                hotelId: params.hotelId,
                startDate: afterStart,
                endDate: periodEnd,
                roomTypeId: period.roomTypeId,
                occupancyTypeId: period.occupancyTypeId,
                price: period.price,
                mealPlanId: period.mealPlanId,
                isActive: true
              }
            });
          }
        }

        // Create the new pricing period
        const hotelPricing = await tx.hotelPricing.create({
          data: {
            hotelId: params.hotelId,
            startDate: newStart,
            endDate: newEnd,
            roomTypeId,
            occupancyTypeId,
            price,
            mealPlanId: mealPlanId || null,
            isActive: true
          }
        });

        return hotelPricing;
      });

      return NextResponse.json(result);
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
        isActive: true
      }
    });

    return NextResponse.json(hotelPricing);
  } catch (error) {
    console.error("[HOTEL_PRICING_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}