import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { hotelId, includeExistingPricing } = await req.json();

    if (!hotelId) {
      return jsonError("Hotel ID is required", 400, "MISSING_HOTEL_ID");
    }

    // Validate hotelId and fetch hotel with location
    const hotel = await prismadb.hotel.findUnique({
      where: { id: hotelId },
      include: { location: true }
    });

    if (!hotel) {
      return jsonError("Hotel not found", 404, "NOT_FOUND");
    }

    // Fetch reference data in parallel
    const [roomTypes, occupancyTypes, mealPlans] = await Promise.all([
      prismadb.roomType.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      }),
      prismadb.occupancyType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, maxPersons: true },
        orderBy: { rank: 'asc' }
      }),
      prismadb.mealPlan.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    // Build reference data
    const referenceData = {
      roomTypes,
      occupancyTypes,
      mealPlans
    };

    // Fetch pricing entries (if requested)
    let pricingEntries = [];
    if (includeExistingPricing) {
      const existingPricing = await prismadb.hotelPricing.findMany({
        where: {
          hotelId,
          isActive: true
        },
        orderBy: [
          { startDate: 'asc' },
          { roomTypeId: 'asc' },
          { occupancyTypeId: 'asc' }
        ]
      });

      pricingEntries = existingPricing.map(p => ({
        startDate: p.startDate.toISOString().split('T')[0],
        endDate: p.endDate.toISOString().split('T')[0],
        roomTypeId: p.roomTypeId,
        occupancyTypeId: p.occupancyTypeId,
        mealPlanId: p.mealPlanId,
        price: p.price,
        isActive: p.isActive
      }));
    } else {
      // Generate sample entries if reference data exists
      if (roomTypes.length > 0 && occupancyTypes.length > 0) {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

        pricingEntries = [
          {
            startDate: nextMonth.toISOString().split('T')[0],
            endDate: endOfNextMonth.toISOString().split('T')[0],
            roomTypeId: roomTypes[0].id,
            occupancyTypeId: occupancyTypes[0].id,
            mealPlanId: mealPlans[0]?.id || null,
            price: 5000,
            isActive: true
          }
        ];
      }
    }

    // Build JSON export
    const jsonExport = {
      version: "1.0",
      metadata: {
        exportedAt: new Date().toISOString(),
        locationId: hotel.locationId,
        locationName: hotel.location?.label || "",
        hotelId: hotel.id,
        hotelName: hotel.name
      },
      referenceData,
      pricingEntries
    };

    return NextResponse.json(jsonExport);
  });
}
