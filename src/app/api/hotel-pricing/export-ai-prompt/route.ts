import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { generateAiPrompt } from "@/lib/hotel-pricing-json";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { hotelId } = await req.json();

    if (!hotelId) {
      return jsonError("Hotel ID is required", 400, "MISSING_HOTEL_ID");
    }

    // Fetch hotel with location
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

    const referenceData = {
      roomTypes,
      occupancyTypes,
      mealPlans
    };

    const prompt = generateAiPrompt(
      hotel.id,
      hotel.name,
      hotel.locationId,
      hotel.location?.label || "",
      referenceData
    );

    return NextResponse.json({ prompt });
  });
}
