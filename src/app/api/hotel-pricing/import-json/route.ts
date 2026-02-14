import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { importPayloadSchema, type ImportPreview, type ImportValidationError } from "@/lib/hotel-pricing-json";
import { dateRangesOverlap } from "@/lib/hotel-pricing-import";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const body = await req.json();
    const { confirm = false } = body;

    // Step 1: JSON Schema Validation
    let parsed;
    try {
      parsed = importPayloadSchema.parse(body);
    } catch (error: any) {
      return jsonError("Invalid JSON structure", 422, "VALIDATION", {
        errors: error.errors.map((e: any) => ({
          type: 'syntax',
          severity: 'error',
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    // Step 2: Fetch Reference Data (for validation)
    const [hotel, roomTypes, occupancyTypes, mealPlans] = await Promise.all([
      prismadb.hotel.findUnique({ where: { id: parsed.metadata.hotelId } }),
      prismadb.roomType.findMany({ where: { isActive: true } }),
      prismadb.occupancyType.findMany({ where: { isActive: true } }),
      prismadb.mealPlan.findMany({ where: { isActive: true } })
    ]);

    if (!hotel) {
      return jsonError("Hotel not found", 404, "NOT_FOUND");
    }

    // Build lookup maps
    const roomTypeMap = new Map(roomTypes.map(rt => [rt.id, rt]));
    const occupancyTypeMap = new Map(occupancyTypes.map(ot => [ot.id, ot]));
    const mealPlanMap = new Map(mealPlans.map(mp => [mp.id, mp]));

    // Step 3: Validate Each Entry
    const errors: ImportValidationError[] = [];
    const warnings: string[] = [];
    const validEntries: any[] = [];

    for (let i = 0; i < parsed.pricingEntries.length; i++) {
      const entry = parsed.pricingEntries[i];
      const entryErrors: ImportValidationError[] = [];

      // Validate room type
      if (!roomTypeMap.has(entry.roomTypeId)) {
        entryErrors.push({
          type: 'validation',
          severity: 'error',
          entryIndex: i,
          field: 'roomTypeId',
          message: `Room type ID "${entry.roomTypeId}" not found or inactive`,
          value: entry.roomTypeId
        });
      }

      // Validate occupancy type
      if (!occupancyTypeMap.has(entry.occupancyTypeId)) {
        entryErrors.push({
          type: 'validation',
          severity: 'error',
          entryIndex: i,
          field: 'occupancyTypeId',
          message: `Occupancy type ID "${entry.occupancyTypeId}" not found or inactive`,
          value: entry.occupancyTypeId
        });
      }

      // Validate meal plan (if provided)
      if (entry.mealPlanId && !mealPlanMap.has(entry.mealPlanId)) {
        entryErrors.push({
          type: 'validation',
          severity: 'error',
          entryIndex: i,
          field: 'mealPlanId',
          message: `Meal plan ID "${entry.mealPlanId}" not found or inactive`,
          value: entry.mealPlanId
        });
      }

      // Validate dates
      const startDateUtc = dateToUtc(entry.startDate);
      const endDateUtc = dateToUtc(entry.endDate);

      if (!startDateUtc) {
        entryErrors.push({
          type: 'validation',
          severity: 'error',
          entryIndex: i,
          field: 'startDate',
          message: 'Invalid start date',
          value: entry.startDate
        });
      }

      if (!endDateUtc) {
        entryErrors.push({
          type: 'validation',
          severity: 'error',
          entryIndex: i,
          field: 'endDate',
          message: 'Invalid end date',
          value: entry.endDate
        });
      }

      if (entryErrors.length > 0) {
        errors.push(...entryErrors);
        continue;
      }

      validEntries.push({
        index: i,
        entry,
        startDateUtc: startDateUtc!,
        endDateUtc: endDateUtc!,
        roomType: roomTypeMap.get(entry.roomTypeId)!,
        occupancyType: occupancyTypeMap.get(entry.occupancyTypeId)!,
        mealPlan: entry.mealPlanId ? mealPlanMap.get(entry.mealPlanId) : null
      });
    }

    // Step 4: Check for Overlaps within the import data
    for (let i = 0; i < validEntries.length; i++) {
      for (let j = i + 1; j < validEntries.length; j++) {
        const a = validEntries[i];
        const b = validEntries[j];

        // Check if same combination
        if (
          a.entry.roomTypeId === b.entry.roomTypeId &&
          a.entry.occupancyTypeId === b.entry.occupancyTypeId &&
          a.entry.mealPlanId === b.entry.mealPlanId
        ) {
          // Check if dates overlap
          if (dateRangesOverlap(a.startDateUtc, a.endDateUtc, b.startDateUtc, b.endDateUtc)) {
            warnings.push(
              `Entries ${i + 1} and ${j + 1} have overlapping dates for the same room/occupancy/meal combination`
            );
          }
        }
      }
    }

    // Step 5: Check for overlaps with existing database records
    if (validEntries.length > 0) {
      const existingPricing = await prismadb.hotelPricing.findMany({
        where: { hotelId: hotel.id }
      });

      for (const valid of validEntries) {
        for (const existing of existingPricing) {
          if (
            existing.roomTypeId === valid.entry.roomTypeId &&
            existing.occupancyTypeId === valid.entry.occupancyTypeId &&
            existing.mealPlanId === valid.entry.mealPlanId
          ) {
            if (dateRangesOverlap(
              valid.startDateUtc,
              valid.endDateUtc,
              existing.startDate,
              existing.endDate
            )) {
              warnings.push(
                `Entry ${valid.index + 1} overlaps with existing pricing (${existing.startDate.toISOString().split('T')[0]} to ${existing.endDate.toISOString().split('T')[0]})`
              );
            }
          }
        }
      }
    }

    // Step 6: Build Preview
    const preview: ImportPreview = {
      summary: {
        totalEntries: parsed.pricingEntries.length,
        newEntries: validEntries.length,
        updates: 0,
        errors: errors.length,
        warnings: warnings.length
      },
      entries: validEntries.map(v => ({
        index: v.index,
        roomTypeName: v.roomType.name,
        occupancyTypeName: v.occupancyType.name,
        mealPlanCode: v.mealPlan?.code,
        startDate: v.entry.startDate,
        endDate: v.entry.endDate,
        price: v.entry.price,
        action: 'create' as const,
        status: 'valid' as const,
        messages: []
      })),
      errors,
      warnings
    };

    // If validation only, return preview
    if (!confirm) {
      if (errors.length > 0) {
        return jsonError("Validation failed", 422, "VALIDATION", preview);
      }
      return NextResponse.json(preview);
    }

    // Step 7: Apply Import (if confirmed and no errors)
    if (errors.length > 0) {
      return jsonError("Cannot import with validation errors", 422, "VALIDATION", preview);
    }

    // Use Prisma transaction for all-or-nothing import
    let created = 0;
    let updated = 0;

    await prismadb.$transaction(async (tx) => {
      for (const valid of validEntries) {
        const existing = await tx.hotelPricing.findFirst({
          where: {
            hotelId: hotel.id,
            roomTypeId: valid.entry.roomTypeId,
            occupancyTypeId: valid.entry.occupancyTypeId,
            mealPlanId: valid.entry.mealPlanId,
            startDate: valid.startDateUtc,
            endDate: valid.endDateUtc
          }
        });

        if (existing) {
          await tx.hotelPricing.update({
            where: { id: existing.id },
            data: {
              price: valid.entry.price,
              isActive: valid.entry.isActive
            }
          });
          updated++;
        } else {
          await tx.hotelPricing.create({
            data: {
              hotelId: hotel.id,
              roomTypeId: valid.entry.roomTypeId,
              occupancyTypeId: valid.entry.occupancyTypeId,
              mealPlanId: valid.entry.mealPlanId,
              startDate: valid.startDateUtc,
              endDate: valid.endDateUtc,
              price: valid.entry.price,
              isActive: valid.entry.isActive
            }
          });
          created++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalEntries: parsed.pricingEntries.length,
        created,
        updated
      },
      warnings
    });
  });
}
