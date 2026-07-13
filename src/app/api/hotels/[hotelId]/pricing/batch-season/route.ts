import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import {
  applyPercentToSheet,
  filterSheetsForSeason,
  groupPricingIntoSheets,
} from "@/lib/hotel-pricing-matrix";
import { flattenSheetToRows } from "@/lib/hotel-pricing-matrix";
import { upsertExactPricingRow } from "@/lib/hotel-pricing-overlap";
import { findOverlappingBasePricings } from "@/lib/hotel-effective-pricing";
import { generateDateRangesForYear, type SeasonalPeriod } from "@/lib/seasonal-periods";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

const copySeasonSchema = z.object({
  action: z.literal("copy-season"),
  sourceSeasonalPeriodId: z.string().min(1),
  targetSeasonalPeriodId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
});

const percentAdjustSchema = z.object({
  action: z.literal("percent-adjust"),
  seasonalPeriodId: z.string().optional(),
  percentChange: z.number(),
  year: z.number().int().min(2020).max(2100).optional(),
});

const batchSeasonSchema = z.discriminatedUnion("action", [
  copySeasonSchema,
  percentAdjustSchema,
]);

/** Bulk season operations: copy season pricing or apply % adjustment */
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
    const parsed = batchSeasonSchema.safeParse(body);
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

    const existingPricing = await prismadb.hotelPricing.findMany({
      where: { hotelId: params.hotelId, isActive: true },
      include: {
        roomType: true,
        occupancyType: true,
        mealPlan: true,
        locationSeasonalPeriod: true,
      },
    });

    const sheets = groupPricingIntoSheets(existingPricing);

    if (parsed.data.action === "copy-season") {
      const { sourceSeasonalPeriodId, targetSeasonalPeriodId, year } = parsed.data;

      const [sourcePeriod, targetPeriod] = await Promise.all([
        prismadb.locationSeasonalPeriod.findUnique({
          where: { id: sourceSeasonalPeriodId },
        }),
        prismadb.locationSeasonalPeriod.findUnique({
          where: { id: targetSeasonalPeriodId },
        }),
      ]);

      if (!sourcePeriod || !targetPeriod) {
        return jsonError("Seasonal period not found", 404, "NOT_FOUND");
      }

      const sourceSheets = filterSheetsForSeason(sheets, sourceSeasonalPeriodId);
      if (sourceSheets.length === 0) {
        return jsonError("No pricing found for source season", 404, "NOT_FOUND");
      }

      const targetRanges = generateDateRangesForYear(
        targetPeriod as SeasonalPeriod,
        year
      );
      let created = 0;

      await prismadb.$transaction(async (tx) => {
        for (const sourceSheet of sourceSheets) {
          for (const range of targetRanges) {
            const startDateStr = range.start.toISOString().split("T")[0];
            const endDateStr = range.end.toISOString().split("T")[0];
            const flatRows = flattenSheetToRows({
              hotelId: params.hotelId,
              startDate: startDateStr,
              endDate: endDateStr,
              roomTypeId: sourceSheet.roomTypeId,
              mealPlanId: sourceSheet.mealPlanId,
              locationSeasonalPeriodId: targetSeasonalPeriodId,
              occupancyPrices: sourceSheet.occupancyPrices,
            });

            for (const row of flatRows) {
              const startDate = dateToUtc(row.startDate)!;
              const endDate = dateToUtc(row.endDate)!;
              const conflicts = await findOverlappingBasePricings(tx, {
                hotelId: params.hotelId,
                startDate,
                endDate,
                roomTypeId: row.roomTypeId,
                occupancyTypeId: row.occupancyTypeId,
                mealPlanId: row.mealPlanId,
              });
              const blockingConflicts = conflicts.filter(
                (conflict) =>
                  conflict.startDate.getTime() !== startDate.getTime() ||
                  conflict.endDate.getTime() !== endDate.getTime()
              );
              if (blockingConflicts.length > 0) {
                throw Object.assign(new Error("PRICING_OVERLAP"), {
                  code: "PRICING_OVERLAP",
                  conflicts: blockingConflicts,
                });
              }
              await upsertExactPricingRow(tx, {
                ...row,
                startDate,
                endDate,
                locationSeasonalPeriodId: targetSeasonalPeriodId,
              });
              created++;
            }
          }
        }
      });

      return NextResponse.json({ success: true, action: "copy-season", created });
    }

    // percent-adjust
    const { seasonalPeriodId, percentChange } = parsed.data;
    let targetSheets = sheets;
    if (seasonalPeriodId) {
      targetSheets = filterSheetsForSeason(sheets, seasonalPeriodId);
    }

    let updated = 0;
    await prismadb.$transaction(async (tx) => {
      for (const sheet of targetSheets) {
        const adjusted = applyPercentToSheet(sheet, percentChange);
        const flatRows = flattenSheetToRows({
          hotelId: params.hotelId,
          startDate: adjusted.startDate,
          endDate: adjusted.endDate,
          roomTypeId: adjusted.roomTypeId,
          mealPlanId: adjusted.mealPlanId,
          locationSeasonalPeriodId: adjusted.locationSeasonalPeriodId,
          occupancyPrices: adjusted.occupancyPrices,
        });

        for (const row of flatRows) {
          const startDate = dateToUtc(row.startDate)!;
          const endDate = dateToUtc(row.endDate)!;
          const conflicts = await findOverlappingBasePricings(tx, {
            hotelId: params.hotelId,
            startDate,
            endDate,
            roomTypeId: row.roomTypeId,
            occupancyTypeId: row.occupancyTypeId,
            mealPlanId: row.mealPlanId,
            excludeId: row.rowId,
          });
          if (conflicts.length > 0) {
            throw Object.assign(new Error("PRICING_OVERLAP"), {
              code: "PRICING_OVERLAP",
              conflicts,
            });
          }
          await upsertExactPricingRow(tx, {
            ...row,
            startDate,
            endDate,
            rowId: row.rowId,
          });
          updated++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      action: "percent-adjust",
      updated,
      percentChange,
    });
  });
}
