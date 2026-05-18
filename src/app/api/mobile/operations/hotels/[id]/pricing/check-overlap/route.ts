import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc, MILLISECONDS_PER_DAY } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireOperationsRead } from "@/app/api/mobile/lib/assert-operations-access";

export const dynamic = "force-dynamic";

const overlapSchema = z.object({
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  roomTypeId: z.string().min(1),
  occupancyTypeId: z.string().min(1),
  mealPlanId: z.string().nullable().optional(),
  price: z.coerce.number().optional(),
  excludeId: z.string().optional(),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });

    const parsed = overlapSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid overlap payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const startDate = dateToUtc(v.startDate);
    const endDate = dateToUtc(v.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }

    const overlappingPeriods = await prismadb.hotelPricing.findMany({
      where: {
        hotelId: params.id,
        roomTypeId: v.roomTypeId,
        occupancyTypeId: v.occupancyTypeId,
        mealPlanId: v.mealPlanId || null,
        isActive: true,
        ...(v.excludeId ? { id: { not: v.excludeId } } : {}),
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
      },
      orderBy: { startDate: "asc" },
    });

    if (!overlappingPeriods.length) {
      return NextResponse.json({
        willSplit: false,
        affectedPeriods: [],
        resultingPeriods: [
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            price: v.price ?? 0,
            isNew: true,
            isExisting: false,
          },
        ],
        message: "No overlapping periods found. This pricing can be saved as-is.",
      });
    }

    const resultingPeriods: Array<{
      startDate: string;
      endDate: string;
      price: number;
      isNew: boolean;
      isExisting: boolean;
    }> = [];

    const affectedPeriods = overlappingPeriods.map((period) => {
      if (period.startDate < startDate) {
        resultingPeriods.push({
          startDate: period.startDate.toISOString(),
          endDate: new Date(startDate.getTime() - MILLISECONDS_PER_DAY).toISOString(),
          price: period.price,
          isNew: false,
          isExisting: true,
        });
      }
      if (period.endDate > endDate) {
        resultingPeriods.push({
          startDate: new Date(endDate.getTime() + MILLISECONDS_PER_DAY).toISOString(),
          endDate: period.endDate.toISOString(),
          price: period.price,
          isNew: false,
          isExisting: true,
        });
      }
      return {
        id: period.id,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        price: period.price,
        roomType: period.roomType?.name ?? "Unknown room",
        occupancy: period.occupancyType?.name ?? "Unknown occupancy",
        mealPlan: period.mealPlan
          ? `${period.mealPlan.code} - ${period.mealPlan.name}`
          : undefined,
      };
    });

    resultingPeriods.push({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      price: v.price ?? 0,
      isNew: true,
      isExisting: false,
    });
    resultingPeriods.sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return NextResponse.json({
      willSplit: true,
      affectedPeriods,
      resultingPeriods,
      message: `Found ${overlappingPeriods.length} overlapping pricing period(s). Saving will split existing ranges around this new pricing.`,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_CHECK_OVERLAP]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
