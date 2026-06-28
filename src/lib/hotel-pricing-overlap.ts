import type { Prisma } from "@prisma/client";
import { MILLISECONDS_PER_DAY } from "@/lib/timezone-utils";

export interface OverlapPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  price: number;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  locationSeasonalPeriodId: string | null;
}

export interface UpsertPricingInput {
  hotelId: string;
  startDate: Date;
  endDate: Date;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  price: number;
  locationSeasonalPeriodId?: string | null;
  isActive?: boolean;
}

type PricingTx = Prisma.TransactionClient;

/** Find overlapping pricing periods for the same dimensional key */
export async function findOverlappingPeriods(
  tx: PricingTx,
  params: {
    hotelId: string;
    roomTypeId: string;
    occupancyTypeId: string;
    mealPlanId: string | null;
    startDate: Date;
    endDate: Date;
    excludeId?: string;
  }
) {
  return tx.hotelPricing.findMany({
    where: {
      hotelId: params.hotelId,
      roomTypeId: params.roomTypeId,
      occupancyTypeId: params.occupancyTypeId,
      mealPlanId: params.mealPlanId,
      isActive: true,
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      AND: [
        { startDate: { lte: params.endDate } },
        { endDate: { gte: params.startDate } },
      ],
    },
    orderBy: { startDate: "asc" },
  });
}

/** Split overlapping periods and create the new pricing row */
export async function upsertPricingWithSplit(
  tx: PricingTx,
  input: UpsertPricingInput,
  options?: { excludeId?: string }
) {
  const overlappingPeriods = await findOverlappingPeriods(tx, {
    hotelId: input.hotelId,
    roomTypeId: input.roomTypeId,
    occupancyTypeId: input.occupancyTypeId,
    mealPlanId: input.mealPlanId,
    startDate: input.startDate,
    endDate: input.endDate,
    excludeId: options?.excludeId,
  });

  for (const period of overlappingPeriods) {
    const periodStart = period.startDate;
    const periodEnd = period.endDate;

    await tx.hotelPricing.delete({ where: { id: period.id } });

    if (periodStart < input.startDate) {
      const beforeEnd = new Date(input.startDate.getTime() - MILLISECONDS_PER_DAY);
      await tx.hotelPricing.create({
        data: {
          hotelId: input.hotelId,
          startDate: periodStart,
          endDate: beforeEnd,
          roomTypeId: period.roomTypeId,
          occupancyTypeId: period.occupancyTypeId,
          price: period.price,
          mealPlanId: period.mealPlanId,
          locationSeasonalPeriodId: period.locationSeasonalPeriodId,
          isActive: true,
        },
      });
    }

    if (periodEnd > input.endDate) {
      const afterStart = new Date(input.endDate.getTime() + MILLISECONDS_PER_DAY);
      await tx.hotelPricing.create({
        data: {
          hotelId: input.hotelId,
          startDate: afterStart,
          endDate: periodEnd,
          roomTypeId: period.roomTypeId,
          occupancyTypeId: period.occupancyTypeId,
          price: period.price,
          mealPlanId: period.mealPlanId,
          locationSeasonalPeriodId: period.locationSeasonalPeriodId,
          isActive: true,
        },
      });
    }
  }

  if (options?.excludeId) {
    const existing = await tx.hotelPricing.findUnique({
      where: { id: options.excludeId },
    });
    if (existing) {
      return tx.hotelPricing.update({
        where: { id: options.excludeId },
        data: {
          startDate: input.startDate,
          endDate: input.endDate,
          roomTypeId: input.roomTypeId,
          occupancyTypeId: input.occupancyTypeId,
          mealPlanId: input.mealPlanId,
          price: input.price,
          locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
          isActive: input.isActive ?? true,
        },
      });
    }
  }

  return tx.hotelPricing.create({
    data: {
      hotelId: input.hotelId,
      startDate: input.startDate,
      endDate: input.endDate,
      roomTypeId: input.roomTypeId,
      occupancyTypeId: input.occupancyTypeId,
      price: input.price,
      mealPlanId: input.mealPlanId,
      locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

/** Upsert exact-match row without splitting (for batch sheet save when dates unchanged) */
export async function upsertExactPricingRow(
  tx: PricingTx,
  input: UpsertPricingInput & { rowId?: string }
) {
  if (input.rowId) {
    const existing = await tx.hotelPricing.findUnique({ where: { id: input.rowId } });
    if (existing) {
      return tx.hotelPricing.update({
        where: { id: input.rowId },
        data: {
          price: input.price,
          isActive: input.isActive ?? true,
          locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
        },
      });
    }
  }

  const exact = await tx.hotelPricing.findFirst({
    where: {
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      occupancyTypeId: input.occupancyTypeId,
      mealPlanId: input.mealPlanId,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });

  if (exact) {
    return tx.hotelPricing.update({
      where: { id: exact.id },
      data: {
        price: input.price,
        isActive: input.isActive ?? true,
        locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
      },
    });
  }

  return tx.hotelPricing.create({
    data: {
      hotelId: input.hotelId,
      startDate: input.startDate,
      endDate: input.endDate,
      roomTypeId: input.roomTypeId,
      occupancyTypeId: input.occupancyTypeId,
      price: input.price,
      mealPlanId: input.mealPlanId,
      locationSeasonalPeriodId: input.locationSeasonalPeriodId ?? null,
      isActive: input.isActive ?? true,
    },
  });
}
