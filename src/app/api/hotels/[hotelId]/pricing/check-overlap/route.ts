import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

// Check for overlapping pricing periods and return split preview
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
      roomTypeId, 
      occupancyTypeId,
      mealPlanId,
      excludeId 
    } = body;

    if (!startDate || !endDate) {
      return new NextResponse("Start date and end date are required", { status: 400 });
    }

    if (!roomTypeId || !occupancyTypeId) {
      return new NextResponse("Room type and occupancy type are required", { status: 400 });
    }

    const newStart = dateToUtc(startDate)!;
    const newEnd = dateToUtc(endDate)!;

    // Find overlapping pricing periods with the same attributes
    const overlappingPeriods = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.hotelId,
        roomTypeId,
        occupancyTypeId,
        mealPlanId: mealPlanId || null,
        isActive: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        AND: [
          { startDate: { lte: newEnd } },
          { endDate: { gte: newStart } }
        ]
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

    if (overlappingPeriods.length === 0) {
      // No overlap - safe to proceed
      return NextResponse.json({
        willSplit: false,
        affectedPeriods: [],
        resultingPeriods: [
          {
            startDate: newStart,
            endDate: newEnd,
            price: body.price || 0,
            isNew: true,
            isExisting: false
          }
        ],
        message: "No overlapping periods found. This pricing will be created as-is."
      });
    }

    // Calculate the resulting periods after split
    const resultingPeriods = [];
    const affectedPeriods = overlappingPeriods.map(period => ({
      id: period.id,
      startDate: period.startDate,
      endDate: period.endDate,
      price: period.price,
      roomType: period.roomType?.name || "Unknown",
      occupancy: period.occupancyType?.name || "Unknown",
      mealPlan: period.mealPlan ? `${period.mealPlan.code} - ${period.mealPlan.name}` : undefined
    }));

    // For each overlapping period, calculate split segments
    for (const period of overlappingPeriods) {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);

      // Before segment (if exists)
      if (periodStart < newStart) {
        const beforeEnd = new Date(newStart);
        beforeEnd.setDate(beforeEnd.getDate() - 1);
        resultingPeriods.push({
          startDate: periodStart,
          endDate: beforeEnd,
          price: period.price,
          isNew: false,
          isExisting: true
        });
      }

      // After segment (if exists)
      if (periodEnd > newEnd) {
        const afterStart = new Date(newEnd);
        afterStart.setDate(afterStart.getDate() + 1);
        resultingPeriods.push({
          startDate: afterStart,
          endDate: periodEnd,
          price: period.price,
          isNew: false,
          isExisting: true
        });
      }
    }

    // Add the new pricing period
    resultingPeriods.push({
      startDate: newStart,
      endDate: newEnd,
      price: body.price || 0,
      isNew: true,
      isExisting: false
    });

    // Sort by start date
    resultingPeriods.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return NextResponse.json({
      willSplit: true,
      affectedPeriods,
      resultingPeriods,
      message: `Found ${overlappingPeriods.length} overlapping pricing period(s). The periods will be automatically split to accommodate your new pricing.`
    });

  } catch (error) {
    console.error("[HOTEL_PRICING_CHECK_OVERLAP]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
