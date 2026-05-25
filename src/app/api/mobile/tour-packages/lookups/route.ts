import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
} from "@/app/api/mobile/lib/assert-operations-access";

export const dynamic = "force-dynamic";

/** Meal plans, vehicle types, pricing attributes, seasonal periods for tour package forms. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId")?.trim() ?? "";

    const [mealPlans, vehicleTypes, pricingAttributes, seasonalPeriods] =
      await Promise.all([
        prismadb.mealPlan.findMany({
          where: { isActive: true },
          select: { id: true, name: true, code: true, description: true },
          orderBy: { name: "asc" },
        }),
        prismadb.vehicleType.findMany({
          where: { isActive: true },
          select: { id: true, name: true, description: true },
          orderBy: { name: "asc" },
        }),
        prismadb.pricingAttribute.findMany({
          where: { isActive: true },
          select: { id: true, name: true, description: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
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
      mealPlans,
      vehicleTypes,
      pricingAttributes,
      seasonalPeriods,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_LOOKUPS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
