export interface PricingGroupRow {
  id: string;
  startDate: string;
  endDate: string;
  locationSeasonalPeriodId?: string | null;
  seasonalPeriodName?: string | null;
}

export interface SeasonalPeriodLookup {
  id: string;
  name: string;
  seasonType: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface PricingSeasonGroup<T extends PricingGroupRow> {
  key: string;
  title: string;
  startDate: string;
  endDate: string;
  items: T[];
}

export function fmtPricingDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function fmtPricingDateRange(startDate: string, endDate: string): string {
  return `${fmtPricingDate(startDate)} – ${fmtPricingDate(endDate)}`;
}

function toIsoDateOnly(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return value.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function datesForSeason(period: SeasonalPeriodLookup, reference: Date) {
  const year = reference.getFullYear();
  const start = new Date(year, period.startMonth - 1, period.startDay);
  let end = new Date(year, period.endMonth - 1, period.endDay);
  if (end < start) {
    end = new Date(year + 1, period.endMonth - 1, period.endDay);
  }
  return { start, end };
}

function buildGroupKey(row: PricingGroupRow): string {
  const startIso = toIsoDateOnly(row.startDate);
  const endIso = toIsoDateOnly(row.endDate);
  if (row.locationSeasonalPeriodId) {
    return `period:${row.locationSeasonalPeriodId}:${startIso}:${endIso}`;
  }
  return `range:${startIso}:${endIso}`;
}

function inferPeriodName(
  row: PricingGroupRow,
  periods: SeasonalPeriodLookup[]
): string | null {
  const rowStart = toIsoDateOnly(row.startDate);
  const rowEnd = toIsoDateOnly(row.endDate);
  const ref = new Date(row.startDate);

  for (const period of periods) {
    const range = datesForSeason(period, ref);
    const pStart = toIsoDate(range.start);
    const pEnd = toIsoDate(range.end);
    if (pStart === rowStart && pEnd === rowEnd) {
      return period.name;
    }
  }
  return null;
}

function resolveGroupTitle(
  row: PricingGroupRow,
  periods: SeasonalPeriodLookup[]
): string {
  if (row.seasonalPeriodName?.trim()) {
    return row.seasonalPeriodName.trim();
  }
  if (row.locationSeasonalPeriodId) {
    const linked = periods.find((p) => p.id === row.locationSeasonalPeriodId);
    if (linked?.name) return linked.name;
  }
  const inferred = inferPeriodName(row, periods);
  if (inferred) return inferred;
  return fmtPricingDateRange(row.startDate, row.endDate);
}

export function groupPricingBySeason<T extends PricingGroupRow>(
  rows: T[],
  periods: SeasonalPeriodLookup[] = []
): PricingSeasonGroup<T>[] {
  const map = new Map<string, PricingSeasonGroup<T>>();

  for (const row of rows) {
    const key = buildGroupKey(row);
    const existing = map.get(key);
    if (existing) {
      existing.items.push(row);
      continue;
    }
    map.set(key, {
      key,
      title: resolveGroupTitle(row, periods),
      startDate: row.startDate,
      endDate: row.endDate,
      items: [row],
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export function pricingGroupSubtitle<T extends PricingGroupRow>(
  group: PricingSeasonGroup<T>
): string {
  const count = group.items.length;
  const rateLabel = count === 1 ? "rate" : "rates";
  return `${fmtPricingDateRange(group.startDate, group.endDate)} · ${count} ${rateLabel}`;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Toggle a period in/out of a multi-select season list (CRM-style). */
export function toggleSeasonSelection<T extends { id: string }>(
  selected: T[],
  period: T
): T[] {
  const isSelected = selected.some((p) => p.id === period.id);
  return isSelected
    ? selected.filter((p) => p.id !== period.id)
    : [...selected, period];
}

/** Format month/day range for a seasonal period template, e.g. "May 1 - Jun 10". */
export function formatPeriodRangeLabel(period: {
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
}): string {
  if (
    !period.startMonth ||
    !period.startDay ||
    !period.endMonth ||
    !period.endDay ||
    period.startMonth < 1 ||
    period.startMonth > 12 ||
    period.endMonth < 1 ||
    period.endMonth > 12
  ) {
    return "";
  }
  return `${MONTH_SHORT[period.startMonth - 1]} ${period.startDay} - ${MONTH_SHORT[period.endMonth - 1]} ${period.endDay}`;
}

/**
 * If the selection exactly matches all periods of one season type, return that type.
 * Otherwise return null (individual / mixed selection).
 */
export function resolveMatchingSeasonType<
  T extends { id: string; seasonType?: string },
>(selected: T[], allPeriods: T[]): string | null {
  if (selected.length === 0) return null;
  const type = selected[0]?.seasonType;
  if (!type) return null;
  if (!selected.every((p) => p.seasonType === type)) return null;
  const typeCount = allPeriods.filter(
    (p) => p.id !== "__none" && p.seasonType === type
  ).length;
  return selected.length === typeCount ? type : null;
}

export function getSeasonTypeColors(seasonType?: string): {
  bg: string;
  text: string;
  border: string;
  selectedBg: string;
  selectedBorder: string;
} {
  switch (seasonType) {
    case "HIGH_PEAK_SEASON":
      return {
        bg: "#ffe4e6",
        text: "#881337",
        border: "#fda4af",
        selectedBg: "#fecdd3",
        selectedBorder: "#e11d48",
      };
    case "PEAK_SEASON":
      return {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#fecaca",
        selectedBg: "#fecaca",
        selectedBorder: "#dc2626",
      };
    case "OFF_SEASON":
      return {
        bg: "#dbeafe",
        text: "#1e40af",
        border: "#bfdbfe",
        selectedBg: "#bfdbfe",
        selectedBorder: "#2563eb",
      };
    case "SHOULDER_SEASON":
      return {
        bg: "#fef9c3",
        text: "#854d0e",
        border: "#fde68a",
        selectedBg: "#fde68a",
        selectedBorder: "#ca8a04",
      };
    default:
      return {
        bg: "#f5f3f1",
        text: "#1c1917",
        border: "#e8e5e1",
        selectedBg: "#fff7ed",
        selectedBorder: "#e8612d",
      };
  }
}
