/**
 * Pivot flat HotelPricing rows into "rate sheets" for matrix UI / batch import.
 * A sheet = (date range + room + meal plan) with occupancy prices as columns.
 */

export interface FlatPricingRow {
  id: string;
  hotelId: string;
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  locationSeasonalPeriodId?: string | null;
  isActive?: boolean;
  roomType?: { id: string; name: string } | null;
  occupancyType?: { id: string; name: string } | null;
  mealPlan?: { id: string; code: string; name: string } | null;
  locationSeasonalPeriod?: {
    id: string;
    name: string;
    seasonType: string;
  } | null;
}

export interface OccupancyTypeRef {
  id: string;
  name: string;
  rank?: number;
}

export interface OccupancyPrice {
  occupancyTypeId: string;
  price: number;
  rowId?: string;
}

export interface PricingSheet {
  key: string;
  startDate: string;
  endDate: string;
  roomTypeId: string;
  mealPlanId: string | null;
  locationSeasonalPeriodId: string | null;
  occupancyPrices: OccupancyPrice[];
  rowIds: string[];
  roomTypeName?: string;
  mealPlanCode?: string;
  seasonName?: string;
  seasonType?: string;
}

export interface SheetGap {
  occupancyTypeId: string;
  occupancyTypeName: string;
}

export interface CoverageSummary {
  totalSeasons: number;
  seasonsWithPricing: number;
  roomMealCombos: Array<{
    roomTypeId: string;
    roomTypeName: string;
    mealPlanId: string | null;
    mealPlanCode: string;
    seasonsCovered: number;
    totalSeasons: number;
    missingOccupancies: SheetGap[];
  }>;
}

function toDateKey(d: Date | string): string {
  if (typeof d === "string") {
    return d.split("T")[0];
  }
  return d.toISOString().split("T")[0];
}

function normalizeMealPlanId(mealPlanId: string | null | undefined): string | null {
  return mealPlanId ?? null;
}

function normalizeSeasonalPeriodId(id: string | null | undefined): string | null {
  return id ?? null;
}

/** Stable key for React / map lookups */
export function sheetKey(parts: {
  startDate: string;
  endDate: string;
  roomTypeId: string;
  mealPlanId?: string | null;
  locationSeasonalPeriodId?: string | null;
}): string {
  return [
    parts.startDate,
    parts.endDate,
    parts.roomTypeId,
    normalizeMealPlanId(parts.mealPlanId) ?? "none",
    normalizeSeasonalPeriodId(parts.locationSeasonalPeriodId) ?? "none",
  ].join("|");
}

/** Group flat pricing rows into matrix sheets */
export function groupPricingIntoSheets(
  flatRows: FlatPricingRow[],
  _occupancyTypes?: OccupancyTypeRef[]
): PricingSheet[] {
  const map = new Map<string, PricingSheet>();

  for (const row of flatRows) {
    if (!row.roomTypeId || !row.occupancyTypeId) continue;
    if (row.isActive === false) continue;

    const startDate = toDateKey(row.startDate);
    const endDate = toDateKey(row.endDate);
    const mealPlanId = normalizeMealPlanId(row.mealPlanId);
    const locationSeasonalPeriodId = normalizeSeasonalPeriodId(row.locationSeasonalPeriodId);

    const key = sheetKey({
      startDate,
      endDate,
      roomTypeId: row.roomTypeId,
      mealPlanId,
      locationSeasonalPeriodId,
    });

    let sheet = map.get(key);
    if (!sheet) {
      sheet = {
        key,
        startDate,
        endDate,
        roomTypeId: row.roomTypeId,
        mealPlanId,
        locationSeasonalPeriodId,
        occupancyPrices: [],
        rowIds: [],
        roomTypeName: row.roomType?.name,
        mealPlanCode: row.mealPlan?.code,
        seasonName: row.locationSeasonalPeriod?.name,
        seasonType: row.locationSeasonalPeriod?.seasonType,
      };
      map.set(key, sheet);
    }

    const existingOcc = sheet.occupancyPrices.find(
      (o) => o.occupancyTypeId === row.occupancyTypeId
    );
    if (existingOcc) {
      existingOcc.price = row.price;
      existingOcc.rowId = row.id;
    } else {
      sheet.occupancyPrices.push({
        occupancyTypeId: row.occupancyTypeId,
        price: row.price,
        rowId: row.id,
      });
    }

    if (!sheet.rowIds.includes(row.id)) {
      sheet.rowIds.push(row.id);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const dateCmp = a.startDate.localeCompare(b.startDate);
    if (dateCmp !== 0) return dateCmp;
    const roomCmp = (a.roomTypeName ?? "").localeCompare(b.roomTypeName ?? "");
    if (roomCmp !== 0) return roomCmp;
    return (a.mealPlanCode ?? "").localeCompare(b.mealPlanCode ?? "");
  });
}

/** Expand a sheet back to flat rows for upsert */
export function flattenSheetToRows(sheet: {
  hotelId: string;
  startDate: string;
  endDate: string;
  roomTypeId: string;
  mealPlanId?: string | null;
  locationSeasonalPeriodId?: string | null;
  occupancyPrices: OccupancyPrice[];
  isActive?: boolean;
}): Array<{
  hotelId: string;
  startDate: string;
  endDate: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | null;
  locationSeasonalPeriodId: string | null;
  price: number;
  isActive: boolean;
  rowId?: string;
}> {
  return sheet.occupancyPrices
    .filter((o) => typeof o.price === "number" && o.price >= 0)
    .map((o) => ({
      hotelId: sheet.hotelId,
      startDate: sheet.startDate,
      endDate: sheet.endDate,
      roomTypeId: sheet.roomTypeId,
      occupancyTypeId: o.occupancyTypeId,
      mealPlanId: normalizeMealPlanId(sheet.mealPlanId),
      locationSeasonalPeriodId: normalizeSeasonalPeriodId(sheet.locationSeasonalPeriodId),
      price: o.price,
      isActive: sheet.isActive ?? true,
      rowId: o.rowId,
    }));
}

/** Missing occupancy prices on a sheet */
export function detectGaps(
  sheet: PricingSheet,
  occupancyTypes: OccupancyTypeRef[]
): SheetGap[] {
  const priced = new Set(sheet.occupancyPrices.map((o) => o.occupancyTypeId));
  return occupancyTypes
    .filter((ot) => !priced.has(ot.id))
    .map((ot) => ({
      occupancyTypeId: ot.id,
      occupancyTypeName: ot.name,
    }));
}

/** Filter sheets linked to a seasonal period */
export function filterSheetsForSeason(
  sheets: PricingSheet[],
  seasonalPeriodId: string
): PricingSheet[] {
  return sheets.filter((s) => s.locationSeasonalPeriodId === seasonalPeriodId);
}

/** Group sheets by season name for matrix view sections */
export function groupSheetsBySeason(
  sheets: PricingSheet[]
): Array<{ seasonKey: string; seasonName: string; seasonType?: string; sheets: PricingSheet[] }> {
  const groups = new Map<
    string,
    { seasonKey: string; seasonName: string; seasonType?: string; sheets: PricingSheet[] }
  >();

  for (const sheet of sheets) {
    const seasonKey = sheet.locationSeasonalPeriodId ?? "__manual__";
    const seasonName = sheet.seasonName ?? "Manual / Custom Dates";
    let group = groups.get(seasonKey);
    if (!group) {
      group = { seasonKey, seasonName, seasonType: sheet.seasonType, sheets: [] };
      groups.set(seasonKey, group);
    }
    group.sheets.push(sheet);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.seasonKey === "__manual__") return 1;
    if (b.seasonKey === "__manual__") return -1;
    const firstA = a.sheets[0]?.startDate ?? "";
    const firstB = b.sheets[0]?.startDate ?? "";
    return firstA.localeCompare(firstB);
  });
}

/** Filter sheets overlapping a calendar year */
export function filterSheetsForYear(sheets: PricingSheet[], year: number): PricingSheet[] {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  return sheets.filter(
    (s) => s.startDate <= yearEnd && s.endDate >= yearStart
  );
}

/** Apply percentage adjustment to all occupancy prices on a sheet */
export function applyPercentToSheet(
  sheet: PricingSheet,
  percentChange: number
): PricingSheet {
  const factor = 1 + percentChange / 100;
  return {
    ...sheet,
    occupancyPrices: sheet.occupancyPrices.map((o) => ({
      ...o,
      price: Math.round(o.price * factor),
    })),
  };
}

/** Build coverage summary for room/meal combos across seasons */
export function buildCoverageSummary(
  sheets: PricingSheet[],
  occupancyTypes: OccupancyTypeRef[],
  seasonalPeriodIds: string[]
): CoverageSummary {
  const seasonSet = new Set(seasonalPeriodIds);
  const comboMap = new Map<
    string,
    {
      roomTypeId: string;
      roomTypeName: string;
      mealPlanId: string | null;
      mealPlanCode: string;
      seasonsWithPricing: Set<string>;
      gapsBySeason: Map<string, SheetGap[]>;
    }
  >();

  for (const sheet of sheets) {
    if (!sheet.locationSeasonalPeriodId || !seasonSet.has(sheet.locationSeasonalPeriodId)) {
      continue;
    }
    const comboKey = `${sheet.roomTypeId}|${sheet.mealPlanId ?? "none"}`;
    let combo = comboMap.get(comboKey);
    if (!combo) {
      combo = {
        roomTypeId: sheet.roomTypeId,
        roomTypeName: sheet.roomTypeName ?? sheet.roomTypeId,
        mealPlanId: sheet.mealPlanId,
        mealPlanCode: sheet.mealPlanCode ?? "-",
        seasonsWithPricing: new Set(),
        gapsBySeason: new Map(),
      };
      comboMap.set(comboKey, combo);
    }
    combo.seasonsWithPricing.add(sheet.locationSeasonalPeriodId);
    const gaps = detectGaps(sheet, occupancyTypes);
    if (gaps.length > 0) {
      combo.gapsBySeason.set(sheet.locationSeasonalPeriodId, gaps);
    }
  }

  const totalSeasons = seasonalPeriodIds.length;
  const roomMealCombos = Array.from(comboMap.values()).map((combo) => {
    const allGaps: SheetGap[] = [];
    combo.gapsBySeason.forEach((gaps) => allGaps.push(...gaps));
    const uniqueGaps = Array.from(
      new Map(allGaps.map((g) => [g.occupancyTypeId, g])).values()
    );
    return {
      roomTypeId: combo.roomTypeId,
      roomTypeName: combo.roomTypeName,
      mealPlanId: combo.mealPlanId,
      mealPlanCode: combo.mealPlanCode,
      seasonsCovered: combo.seasonsWithPricing.size,
      totalSeasons,
      missingOccupancies: uniqueGaps,
    };
  });

  const seasonsWithAnyPricing = new Set<string>();
  sheets.forEach((s) => {
    if (s.locationSeasonalPeriodId && seasonSet.has(s.locationSeasonalPeriodId)) {
      seasonsWithAnyPricing.add(s.locationSeasonalPeriodId);
    }
  });

  return {
    totalSeasons,
    seasonsWithPricing: seasonsWithAnyPricing.size,
    roomMealCombos,
  };
}

/** Get price for occupancy from sheet (undefined if missing) */
export function getOccupancyPrice(
  sheet: PricingSheet,
  occupancyTypeId: string
): number | undefined {
  return sheet.occupancyPrices.find((o) => o.occupancyTypeId === occupancyTypeId)?.price;
}
