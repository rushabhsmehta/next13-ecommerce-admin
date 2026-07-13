import type { Prisma } from "@prisma/client";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type PricingTx = Prisma.TransactionClient;

export type HotelRateKey = {
  hotelId: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
};

export type SpecialDateOverlapParams = HotelRateKey & {
  startDate: Date;
  endDate: Date;
  excludeId?: string;
};

export type PricingOverlapParams = HotelRateKey & {
  startDate: Date;
  endDate: Date;
  excludeId?: string;
};

export type EffectivePricingParams = {
  hotelId: string;
  startDate: Date;
  endDate: Date;
  roomTypeId?: string;
  occupancyTypeId?: string;
  mealPlanId?: string | null;
};

type RelationSummary = { id: string; name: string } | null;
type MealPlanSummary = { id: string; name: string; code: string } | null;
type SeasonalPeriodSummary = { id: string; name: string; seasonType: string } | null;

type BasePricingRow = {
  id: string;
  hotelId: string;
  startDate: Date;
  endDate: Date;
  price: number;
  isActive: boolean;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  locationSeasonalPeriodId: string | null;
  roomType: RelationSummary;
  occupancyType: RelationSummary;
  mealPlan: MealPlanSummary;
  locationSeasonalPeriod: SeasonalPeriodSummary;
};

type SpecialPricingRow = {
  id: string;
  hotelId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  price: number;
  isActive: boolean;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  notes: string | null;
  roomType: RelationSummary;
  occupancyType: RelationSummary;
  mealPlan: MealPlanSummary;
};

export type EffectiveHotelPricingRow = {
  id: string;
  hotelId: string;
  startDate: Date;
  endDate: Date;
  price: number;
  isActive: true;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  locationSeasonalPeriodId: string | null;
  roomType: RelationSummary;
  occupancyType: RelationSummary;
  mealPlan: MealPlanSummary;
  locationSeasonalPeriod: SeasonalPeriodSummary;
  priceSource: "BASE" | "SPECIAL_DATE";
  sourceLabel: string;
  basePricingId?: string;
  specialDatePricingId?: string;
  specialDateName?: string;
  specialDateNotes?: string | null;
};

export type EffectivePricingWarning = {
  code: "MISSING_SPECIAL_DATE_PRICE";
  message: string;
  startDate: Date;
  endDate: Date;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  specialDatePricingId: string;
  specialDateName: string;
};

export type EffectivePricingResult = {
  rows: EffectiveHotelPricingRow[];
  warnings: EffectivePricingWarning[];
};

export function rateKey(input: {
  hotelId: string;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
}) {
  return [
    input.hotelId,
    input.roomTypeId ?? "null",
    input.occupancyTypeId ?? "null",
    input.mealPlanId ?? "null",
  ].join("|");
}

export async function findOverlappingSpecialDatePricings(
  tx: PricingTx,
  params: SpecialDateOverlapParams
) {
  return tx.hotelSpecialDatePricing.findMany({
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
    include: {
      roomType: true,
      occupancyType: true,
      mealPlan: true,
    },
    orderBy: { startDate: "asc" },
  });
}

export async function findOverlappingBasePricings(
  tx: PricingTx,
  params: PricingOverlapParams
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
    include: {
      roomType: true,
      occupancyType: true,
      mealPlan: true,
      locationSeasonalPeriod: true,
    },
    orderBy: { startDate: "asc" },
  });
}

export function dateRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA <= endB && endA >= startB;
}

export function clampRange(
  startDate: Date,
  endDate: Date,
  minDate: Date,
  maxDate: Date
) {
  return {
    startDate: startDate > minDate ? startDate : minDate,
    endDate: endDate < maxDate ? endDate : maxDate,
  };
}

function dateOnlyKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

function isSameCalendarDay(a: Date, b: Date) {
  return dateOnlyKey(a) === dateOnlyKey(b);
}

function sameSegmentSource(
  row: EffectiveHotelPricingRow,
  source: EffectiveHotelPricingRow
) {
  return (
    row.priceSource === source.priceSource &&
    row.price === source.price &&
    row.basePricingId === source.basePricingId &&
    row.specialDatePricingId === source.specialDatePricingId &&
    row.roomTypeId === source.roomTypeId &&
    row.occupancyTypeId === source.occupancyTypeId &&
    row.mealPlanId === source.mealPlanId
  );
}

function createBaseEffectiveRow(
  row: BasePricingRow,
  startDate: Date,
  endDate: Date
): EffectiveHotelPricingRow {
  return {
    id: `base:${row.id}:${dateOnlyKey(startDate)}:${dateOnlyKey(endDate)}`,
    hotelId: row.hotelId,
    startDate,
    endDate,
    price: row.price,
    isActive: true,
    roomTypeId: row.roomTypeId,
    occupancyTypeId: row.occupancyTypeId,
    mealPlanId: row.mealPlanId,
    locationSeasonalPeriodId: row.locationSeasonalPeriodId,
    roomType: row.roomType,
    occupancyType: row.occupancyType,
    mealPlan: row.mealPlan,
    locationSeasonalPeriod: row.locationSeasonalPeriod,
    priceSource: "BASE",
    sourceLabel: "Base Pricing",
    basePricingId: row.id,
  };
}

function createSpecialEffectiveRow(
  special: SpecialPricingRow,
  base: BasePricingRow | null,
  startDate: Date,
  endDate: Date
): EffectiveHotelPricingRow {
  return {
    id: `special:${special.id}:${dateOnlyKey(startDate)}:${dateOnlyKey(endDate)}`,
    hotelId: special.hotelId,
    startDate,
    endDate,
    price: special.price,
    isActive: true,
    roomTypeId: special.roomTypeId,
    occupancyTypeId: special.occupancyTypeId,
    mealPlanId: special.mealPlanId,
    locationSeasonalPeriodId: base?.locationSeasonalPeriodId ?? null,
    roomType: special.roomType,
    occupancyType: special.occupancyType,
    mealPlan: special.mealPlan,
    locationSeasonalPeriod: base?.locationSeasonalPeriod ?? null,
    priceSource: "SPECIAL_DATE",
    sourceLabel: `Special Date Pricing: ${special.name}`,
    basePricingId: base?.id,
    specialDatePricingId: special.id,
    specialDateName: special.name,
    specialDateNotes: special.notes,
  };
}

function appendEffectiveRow(
  rows: EffectiveHotelPricingRow[],
  next: EffectiveHotelPricingRow
) {
  const previous = rows[rows.length - 1];
  if (
    previous &&
    sameSegmentSource(previous, next) &&
    isSameCalendarDay(addDays(previous.endDate, 1), next.startDate)
  ) {
    previous.endDate = next.endDate;
    previous.id = `${previous.priceSource.toLowerCase()}:${
      previous.specialDatePricingId ?? previous.basePricingId
    }:${dateOnlyKey(previous.startDate)}:${dateOnlyKey(previous.endDate)}`;
    return;
  }
  rows.push(next);
}

function specialForDate(
  specials: SpecialPricingRow[],
  base: BasePricingRow,
  date: Date
) {
  const key = rateKey(base);
  return specials.find(
    (special) =>
      rateKey(special) === key &&
      special.startDate <= date &&
      special.endDate >= date
  );
}

function anySpecialForDate(specials: SpecialPricingRow[], date: Date) {
  return specials.find(
    (special) => special.startDate <= date && special.endDate >= date
  );
}

function warningKey(warning: EffectivePricingWarning) {
  return [
    warning.specialDatePricingId,
    warning.roomTypeId ?? "null",
    warning.occupancyTypeId ?? "null",
    warning.mealPlanId ?? "null",
    dateOnlyKey(warning.startDate),
    dateOnlyKey(warning.endDate),
  ].join("|");
}

function specialDateKey(specialId: string, date: Date) {
  return `${specialId}|${dateOnlyKey(date)}`;
}

export async function resolveEffectiveHotelPricing(
  tx: PricingTx,
  params: EffectivePricingParams
): Promise<EffectivePricingResult> {
  const relationInclude = {
    roomType: true,
    occupancyType: true,
    mealPlan: true,
  } as const;

  const baseRows = (await tx.hotelPricing.findMany({
    where: {
      hotelId: params.hotelId,
      isActive: true,
      ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
      ...(params.occupancyTypeId
        ? { occupancyTypeId: params.occupancyTypeId }
        : {}),
      ...(params.mealPlanId !== undefined
        ? { mealPlanId: params.mealPlanId }
        : {}),
      AND: [
        { startDate: { lte: params.endDate } },
        { endDate: { gte: params.startDate } },
      ],
    },
    include: {
      ...relationInclude,
      locationSeasonalPeriod: true,
    },
    orderBy: { startDate: "asc" },
  })) as BasePricingRow[];

  const specialRows = (await tx.hotelSpecialDatePricing.findMany({
    where: {
      hotelId: params.hotelId,
      isActive: true,
      ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
      ...(params.occupancyTypeId
        ? { occupancyTypeId: params.occupancyTypeId }
        : {}),
      ...(params.mealPlanId !== undefined
        ? { mealPlanId: params.mealPlanId }
        : {}),
      AND: [
        { startDate: { lte: params.endDate } },
        { endDate: { gte: params.startDate } },
      ],
    },
    include: relationInclude,
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  })) as SpecialPricingRow[];

  const rows: EffectiveHotelPricingRow[] = [];
  const warnings = new Map<string, EffectivePricingWarning>();
  const coveredSpecialDates = new Set<string>();

  for (const base of baseRows) {
    if (!base.roomTypeId || !base.occupancyTypeId) {
      const clipped = clampRange(
        base.startDate,
        base.endDate,
        params.startDate,
        params.endDate
      );
      appendEffectiveRow(
        rows,
        createBaseEffectiveRow(base, clipped.startDate, clipped.endDate)
      );
      continue;
    }

    const clipped = clampRange(
      base.startDate,
      base.endDate,
      params.startDate,
      params.endDate
    );

    for (
      let current = clipped.startDate;
      current <= clipped.endDate;
      current = addDays(current, 1)
    ) {
      const matchingSpecial = specialForDate(specialRows, base, current);
      if (matchingSpecial) {
        coveredSpecialDates.add(specialDateKey(matchingSpecial.id, current));
        appendEffectiveRow(
          rows,
          createSpecialEffectiveRow(matchingSpecial, base, current, current)
        );
        continue;
      }

      const specialOnDate = anySpecialForDate(specialRows, current);
      if (specialOnDate) {
        const warning: EffectivePricingWarning = {
          code: "MISSING_SPECIAL_DATE_PRICE",
          message: `Special Date Pricing "${specialOnDate.name}" overlaps this period, but no override exists for ${base.roomType?.name ?? "this room"} / ${base.occupancyType?.name ?? "this occupancy"}${base.mealPlan ? ` / ${base.mealPlan.code}` : ""}. Base pricing was shown for this date.`,
          startDate: current,
          endDate: current,
          roomTypeId: base.roomTypeId,
          occupancyTypeId: base.occupancyTypeId,
          mealPlanId: base.mealPlanId,
          specialDatePricingId: specialOnDate.id,
          specialDateName: specialOnDate.name,
        };
        warnings.set(warningKey(warning), warning);
      }

      appendEffectiveRow(rows, createBaseEffectiveRow(base, current, current));
    }
  }

  for (const special of specialRows) {
    const clipped = clampRange(
      special.startDate,
      special.endDate,
      params.startDate,
      params.endDate
    );
    for (
      let current = clipped.startDate;
      current <= clipped.endDate;
      current = addDays(current, 1)
    ) {
      if (coveredSpecialDates.has(specialDateKey(special.id, current))) continue;
      appendEffectiveRow(
        rows,
        createSpecialEffectiveRow(special, null, current, current)
      );
    }
  }

  rows.sort((a, b) => {
    const dateDiff = a.startDate.getTime() - b.startDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return rateKey(a).localeCompare(rateKey(b));
  });

  return { rows, warnings: Array.from(warnings.values()) };
}
