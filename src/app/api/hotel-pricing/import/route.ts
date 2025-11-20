import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { requireFinanceOrAdmin } from "@/lib/authz";
import {
  HotelPricingImportRow,
  HotelPricingParseError,
  dateRangesOverlap,
  parseHotelPricingWorkbook,
} from "@/lib/hotel-pricing-import";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

interface PreparedRow {
  rowNumber: number;
  hotelId: string;
  roomTypeId: string;
  occupancyTypeId: string;
  occupancyTypeLabel: string;
  mealPlanId: string | null;
  startDateUtc: Date;
  endDateUtc: Date;
  price: number;
  isActive: boolean;
}

const normalize = (input: string | null | undefined) =>
  input ? input.trim().toLowerCase() : "";

const normalizeCode = (input: string | null | undefined) =>
  input ? input.trim().toUpperCase() : "";

type HotelLookup = {
  id: string;
  name: string;
  locationLabel: string | null;
};

type LookupMaps = {
  hotelsById: Map<string, HotelLookup>;
  hotelsByComposite: Map<string, HotelLookup>;
  roomTypeByName: Map<string, { id: string }>;
  occupancyTypeByName: Map<string, { id: string; name: string }>;
  mealPlanByCode: Map<string, { id: string }>;
};

function buildLookupMaps(lookups: {
  hotels: Array<{ id: string; name: string; location: { label: string } | null }>;
  roomTypes: Array<{ id: string; name: string }>;
  occupancyTypes: Array<{ id: string; name: string }>;
  mealPlans: Array<{ id: string; code: string }>;
}): LookupMaps {
  const hotelsById = new Map<string, HotelLookup>();
  const hotelsByComposite = new Map<string, HotelLookup>();

  lookups.hotels.forEach((hotel) => {
    const locationLabel = hotel.location?.label ?? null;
    const descriptor: HotelLookup = {
      id: hotel.id,
      name: hotel.name,
      locationLabel,
    };
    hotelsById.set(hotel.id, descriptor);
    const compositeKey = `${normalize(hotel.name)}|${normalize(locationLabel ?? "")}`;
    hotelsByComposite.set(compositeKey, descriptor);
  });

  const roomTypeByName = new Map<string, { id: string }>();
  lookups.roomTypes.forEach((room) => {
    roomTypeByName.set(normalize(room.name), { id: room.id });
  });

  const occupancyTypeByName = new Map<string, { id: string; name: string }>();
  lookups.occupancyTypes.forEach((occ) => {
    occupancyTypeByName.set(normalize(occ.name), { id: occ.id, name: occ.name });
  });

  const mealPlanByCode = new Map<string, { id: string }>();
  lookups.mealPlans.forEach((plan) => {
    mealPlanByCode.set(normalizeCode(plan.code), { id: plan.id });
  });

  return {
    hotelsById,
    hotelsByComposite,
    roomTypeByName,
    occupancyTypeByName,
    mealPlanByCode,
  };
}

function mapRowsToPrepared(
  rows: HotelPricingImportRow[],
  lookups: LookupMaps
): {
  prepared: PreparedRow[];
  errors: HotelPricingParseError[];
  warnings: string[];
} {
  const prepared: PreparedRow[] = [];
  const errors: HotelPricingParseError[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, { rowNumber: number; occupancyLabel: string }>();
  const rowsByCombination = new Map<string, PreparedRow[]>();

  rows.forEach((row) => {
    const rowErrors: HotelPricingParseError[] = [];
    const rowPrepared: PreparedRow[] = [];

    const hotelIdNormalized = row.hotelId ? row.hotelId.trim() : "";
    let hotel = hotelIdNormalized ? lookups.hotelsById.get(hotelIdNormalized) : undefined;

    if (!hotel && (row.hotelName || row.locationName)) {
      const compositeKey = `${normalize(row.hotelName)}|${normalize(row.locationName)}`;
      hotel = lookups.hotelsByComposite.get(compositeKey);
    }

    if (!hotel) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "hotel_id",
        message: "Hotel could not be matched to database record",
        value: row.hotelId ?? row.hotelName,
      });
    }

    const roomType = lookups.roomTypeByName.get(normalize(row.roomTypeName));
    if (!roomType) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "room_type_name",
        message: `Room type \"${row.roomTypeName}\" not found`,
      });
    }

    let mealPlanId: string | null = null;
    if (row.mealPlanCode) {
      const plan = lookups.mealPlanByCode.get(normalizeCode(row.mealPlanCode));
      if (!plan) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: "meal_plan_code",
          message: `Meal plan code \"${row.mealPlanCode}\" not found`,
        });
      } else {
        mealPlanId = plan.id;
      }
    }

    const startDateUtc = dateToUtc(row.startDate);
    const endDateUtc = dateToUtc(row.endDate);

    if (!startDateUtc) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "start_date",
        message: "Start date could not be converted",
        value: row.startDate,
      });
    }
    if (!endDateUtc) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "end_date",
        message: "End date could not be converted",
        value: row.endDate,
      });
    }

    if (startDateUtc && endDateUtc && startDateUtc > endDateUtc) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        field: "start_date",
        message: "Start date must be on or before end date",
      });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    row.occupancyPrices.forEach((cell) => {
      const occupancyType = lookups.occupancyTypeByName.get(normalize(cell.columnLabel));
      if (!occupancyType) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: cell.columnLabel,
          message: `Occupancy column "${cell.columnLabel}" does not match any active occupancy type`,
        });
        return;
      }

      rowPrepared.push({
        rowNumber: row.rowNumber,
        hotelId: hotel!.id,
        roomTypeId: roomType!.id,
        occupancyTypeId: occupancyType.id,
        occupancyTypeLabel: occupancyType.name,
        mealPlanId,
        startDateUtc: startDateUtc!,
        endDateUtc: endDateUtc!,
        price: cell.price,
        isActive: row.isActive,
      });
    });

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    const rowCombinationEntries: Array<{
      preparedRow: PreparedRow;
      combinationKey: string;
      key: string;
    }> = [];

    for (const preparedRow of rowPrepared) {
      const combinationKey = `${preparedRow.hotelId}|${preparedRow.roomTypeId}|${preparedRow.occupancyTypeId}|${preparedRow.mealPlanId ?? "null"}`;
      const key = `${combinationKey}|${preparedRow.startDateUtc.toISOString()}|${preparedRow.endDateUtc.toISOString()}`;
      const existing = seen.get(key);
      if (existing) {
        rowErrors.push({
          rowNumber: preparedRow.rowNumber,
          field: "start_date",
          message: `Duplicate pricing for ${preparedRow.occupancyTypeLabel} occupancy (matches row ${existing.rowNumber})`,
        });
        continue;
      }

      const existingRows = rowsByCombination.get(combinationKey) ?? [];
      const overlapInUpload = existingRows.find((existingRow) =>
        dateRangesOverlap(
          existingRow.startDateUtc,
          existingRow.endDateUtc,
          preparedRow.startDateUtc,
          preparedRow.endDateUtc
        )
      );
      if (overlapInUpload) {
        warnings.push(
          `Row ${preparedRow.rowNumber} (${preparedRow.occupancyTypeLabel}) overlaps with row ${overlapInUpload.rowNumber} for the same hotel/room/occupancy combination in this upload.`
        );
      }

      rowCombinationEntries.push({ preparedRow, combinationKey, key });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    rowCombinationEntries.forEach(({ preparedRow, combinationKey, key }) => {
      seen.set(key, { rowNumber: preparedRow.rowNumber, occupancyLabel: preparedRow.occupancyTypeLabel });
      const existingRows = rowsByCombination.get(combinationKey) ?? [];
      rowsByCombination.set(combinationKey, [...existingRows, preparedRow]);
      prepared.push(preparedRow);
    });
  });

  return { prepared, errors, warnings };
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    try {
      await requireFinanceOrAdmin(userId);
    } catch (error) {
      return jsonError("Forbidden", 403, "FORBIDDEN");
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return jsonError("File upload is required", 400, "NO_FILE");
    }

    if (file.size === 0) {
      return jsonError("Uploaded file is empty", 400, "EMPTY_FILE");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const parsed = parseHotelPricingWorkbook(buffer, { fileName: file.name });
    if (parsed.errors.length) {
      return jsonError("Validation failed", 422, "VALIDATION", {
        errors: parsed.errors,
        warnings: parsed.warnings,
        stats: parsed.stats,
      });
    }

    if (!parsed.rows.length) {
      return jsonError("No pricing rows detected", 400, "NO_ROWS", {
        warnings: parsed.warnings,
        stats: parsed.stats,
      });
    }

    const [hotels, roomTypes, occupancyTypes, mealPlans] = await Promise.all([
      prismadb.hotel.findMany({
        select: {
          id: true,
          name: true,
          location: { select: { label: true } },
        },
      }),
      prismadb.roomType.findMany({ select: { id: true, name: true } }),
      prismadb.occupancyType.findMany({ select: { id: true, name: true } }),
      prismadb.mealPlan.findMany({ select: { id: true, code: true } }),
    ]);

    const lookups = buildLookupMaps({ hotels, roomTypes, occupancyTypes, mealPlans });
    const { prepared, errors, warnings: mappingWarnings } = mapRowsToPrepared(
      parsed.rows,
      lookups
    );

    if (errors.length) {
      return jsonError("Validation failed", 422, "VALIDATION", {
        errors,
        warnings: [...parsed.warnings, ...mappingWarnings],
        stats: parsed.stats,
      });
    }

    const combinationIndex = new Map<
      string,
      { hotelId: string; roomTypeId: string; occupancyTypeId: string; mealPlanId: string | null }
    >();
    prepared.forEach((row) => {
      const key = `${row.hotelId}|${row.roomTypeId}|${row.occupancyTypeId}|${row.mealPlanId ?? "null"}`;
      if (!combinationIndex.has(key)) {
        combinationIndex.set(key, {
          hotelId: row.hotelId,
          roomTypeId: row.roomTypeId,
          occupancyTypeId: row.occupancyTypeId,
          mealPlanId: row.mealPlanId,
        });
      }
    });

    const combinationFilters = Array.from(combinationIndex.values());
    const existingByCombination = new Map<string, Array<{ id: string; startDate: Date; endDate: Date }>>();

    if (combinationFilters.length > 0) {
      const existingPricings = await prismadb.hotelPricing.findMany({
        where: {
          OR: combinationFilters.map((filter) => ({
            hotelId: filter.hotelId,
            roomTypeId: filter.roomTypeId,
            occupancyTypeId: filter.occupancyTypeId,
            mealPlanId: filter.mealPlanId,
          })),
        },
        select: {
          id: true,
          hotelId: true,
          roomTypeId: true,
          occupancyTypeId: true,
          mealPlanId: true,
          startDate: true,
          endDate: true,
        },
      });

      existingPricings.forEach((pricing) => {
        const key = `${pricing.hotelId}|${pricing.roomTypeId}|${pricing.occupancyTypeId}|${pricing.mealPlanId ?? "null"}`;
        const bucket = existingByCombination.get(key) ?? [];
        bucket.push({
          id: pricing.id,
          startDate: pricing.startDate,
          endDate: pricing.endDate,
        });
        existingByCombination.set(key, bucket);
      });
    }

    const dbOverlapWarnings: string[] = [];
    prepared.forEach((row) => {
      const key = `${row.hotelId}|${row.roomTypeId}|${row.occupancyTypeId}|${row.mealPlanId ?? "null"}`;
      const matches = existingByCombination.get(key);
      if (!matches || matches.length === 0) {
        return;
      }
      matches.forEach((existing) => {
        const sameRange =
          existing.startDate.getTime() === row.startDateUtc.getTime() &&
          existing.endDate.getTime() === row.endDateUtc.getTime();
        if (sameRange) {
          return;
        }
        if (
          dateRangesOverlap(
            row.startDateUtc,
            row.endDateUtc,
            existing.startDate,
            existing.endDate
          )
        ) {
          const startLabel = existing.startDate.toISOString().slice(0, 10);
          const endLabel = existing.endDate.toISOString().slice(0, 10);
          dbOverlapWarnings.push(
            `Row ${row.rowNumber} (${row.occupancyTypeLabel}) overlaps existing pricing (${startLabel} → ${endLabel}).`
          );
        }
      });
    });

    const allWarnings = Array.from(
      new Set([...parsed.warnings, ...mappingWarnings, ...dbOverlapWarnings])
    );

    let created = 0;
    let updated = 0;

    for (const row of prepared) {
      const existing = await prismadb.hotelPricing.findFirst({
        where: {
          hotelId: row.hotelId,
          roomTypeId: row.roomTypeId,
          occupancyTypeId: row.occupancyTypeId,
          mealPlanId: row.mealPlanId,
          startDate: row.startDateUtc,
          endDate: row.endDateUtc,
        },
      });

      if (existing) {
        await prismadb.hotelPricing.update({
          where: { id: existing.id },
          data: {
            price: row.price,
            isActive: row.isActive,
          },
        });
        updated += 1;
      } else {
        await prismadb.hotelPricing.create({
          data: {
            hotelId: row.hotelId,
            roomTypeId: row.roomTypeId,
            occupancyTypeId: row.occupancyTypeId,
            mealPlanId: row.mealPlanId,
            startDate: row.startDateUtc,
            endDate: row.endDateUtc,
            price: row.price,
            isActive: row.isActive,
          },
        });
        created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        sheetName: parsed.stats.sheetName,
        processed: prepared.length,
        created,
        updated,
        skippedEmptyRows: parsed.stats.skippedEmptyRows,
        fileName: parsed.stats.fileName,
      },
      warnings: allWarnings,
    });
  });
}
