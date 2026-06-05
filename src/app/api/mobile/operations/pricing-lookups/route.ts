import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireOperationsRead } from "@/app/api/mobile/lib/assert-operations-access";

export const dynamic = "force-dynamic";

/** Room / occupancy / meal plan config for hotel pricing forms (read-only). */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId")?.trim() ?? "";

    const [roomTypes, occupancyTypes, mealPlans, seasonalPeriods] = await Promise.all([
      prismadb.roomType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, description: true },
        orderBy: { name: "asc" },
      }),
      prismadb.occupancyType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, description: true, maxPersons: true },
        orderBy: { rank: "asc" },
      }),
      prismadb.mealPlan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, description: true },
        orderBy: { name: "asc" },
      }),
      locationId
        ? prismadb.locationSeasonalPeriod.findMany({
            where: { locationId, isActive: true },
            select: {
              id: true,
              name: true,
              seasonType: true,
              startMonth: true,
              startDay: true,
              endMonth: true,
              endDay: true,
              description: true,
            },
            orderBy: [{ startMonth: "asc" }, { startDay: "asc" }],
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      roomTypes,
      occupancyTypes,
      mealPlans,
      seasonalPeriods,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_PRICING_LOOKUPS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
