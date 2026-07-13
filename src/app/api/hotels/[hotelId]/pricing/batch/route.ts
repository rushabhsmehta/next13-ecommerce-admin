import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { flattenSheetToRows } from "@/lib/hotel-pricing-matrix";
import { upsertExactPricingRow } from "@/lib/hotel-pricing-overlap";
import { findOverlappingBasePricings } from "@/lib/hotel-effective-pricing";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

const occupancyPriceSchema = z.object({
  occupancyTypeId: z.string().min(1),
  price: z.number().min(0),
  rowId: z.string().optional(),
});

const batchSheetSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  roomTypeId: z.string().min(1),
  mealPlanId: z.string().optional().nullable(),
  locationSeasonalPeriodId: z.string().optional().nullable(),
  occupancyPrices: z.array(occupancyPriceSchema).min(1),
  deleteMissingOccupancies: z.boolean().optional().default(false),
});

/** Save an entire pricing sheet (all occupancies) in one transaction */
export async function POST(
  req: Request,
  props: { params: Promise<{ hotelId: string }> }
) {
  return handleApi(async () => {
    const params = await props.params;
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (!params.hotelId) {
      return jsonError("Hotel ID is required", 400, "MISSING_HOTEL_ID");
    }

    const body = await req.json();
    const parsed = batchSheetSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request body", 422, "VALIDATION", {
        errors: parsed.error.errors,
      });
    }

    const hotel = await prismadb.hotel.findUnique({
      where: { id: params.hotelId },
    });
    if (!hotel) {
      return jsonError("Hotel not found", 404, "NOT_FOUND");
    }

    const startDate = dateToUtc(parsed.data.startDate);
    const endDate = dateToUtc(parsed.data.endDate);
    if (!startDate || !endDate) {
      return jsonError("Invalid date format", 400, "INVALID_DATES");
    }

    const mealPlanId = parsed.data.mealPlanId ?? null;
    const flatRows = flattenSheetToRows({
      hotelId: params.hotelId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      roomTypeId: parsed.data.roomTypeId,
      mealPlanId,
      locationSeasonalPeriodId: parsed.data.locationSeasonalPeriodId ?? null,
      occupancyPrices: parsed.data.occupancyPrices,
    });

    const savedIds: string[] = [];
    const submittedOccupancyIds = new Set(
      parsed.data.occupancyPrices.map((o) => o.occupancyTypeId)
    );

    for (const row of flatRows) {
      const rowInput = parsed.data.occupancyPrices.find(
        (o) => o.occupancyTypeId === row.occupancyTypeId
      );
      const conflicts = await prismadb.$transaction((tx) =>
        findOverlappingBasePricings(tx, {
          hotelId: params.hotelId,
          startDate,
          endDate,
          roomTypeId: row.roomTypeId,
          occupancyTypeId: row.occupancyTypeId,
          mealPlanId: row.mealPlanId,
          excludeId: rowInput?.rowId,
        })
      );
      if (conflicts.length > 0) {
        return jsonError(
          "Overlapping pricing period exists for the same room, occupancy, and meal plan. Add Special Date Pricing for event/holiday overrides, or adjust the normal pricing dates.",
          409,
          "PRICING_OVERLAP",
          { conflicts }
        );
      }
    }

    await prismadb.$transaction(async (tx) => {
      for (const row of flatRows) {
        const rowInput = parsed.data.occupancyPrices.find(
          (o) => o.occupancyTypeId === row.occupancyTypeId
        );

        const result = await upsertExactPricingRow(tx, {
          ...row,
          startDate,
          endDate,
          rowId: rowInput?.rowId,
        });

        savedIds.push(result.id);
      }

      if (parsed.data.deleteMissingOccupancies) {
        const existingSheetRows = await tx.hotelPricing.findMany({
          where: {
            hotelId: params.hotelId,
            roomTypeId: parsed.data.roomTypeId,
            mealPlanId,
            locationSeasonalPeriodId: parsed.data.locationSeasonalPeriodId ?? null,
            startDate,
            endDate,
            isActive: true,
          },
        });

        for (const existing of existingSheetRows) {
          if (
            existing.occupancyTypeId &&
            !submittedOccupancyIds.has(existing.occupancyTypeId) &&
            !savedIds.includes(existing.id)
          ) {
            await tx.hotelPricing.delete({ where: { id: existing.id } });
          }
        }
      }
    });

    const updated = await prismadb.hotelPricing.findMany({
      where: { id: { in: savedIds } },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
        locationSeasonalPeriod: true,
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({
      success: true,
      rows: updated,
      count: updated.length,
    });
  });
}
