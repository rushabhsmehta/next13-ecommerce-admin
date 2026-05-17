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

    const [roomTypes, occupancyTypes, mealPlans] = await Promise.all([
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
    ]);

    return NextResponse.json({
      roomTypes,
      occupancyTypes,
      mealPlans,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_PRICING_LOOKUPS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
