import {
  findSeasonalPeriodForDate,
  type SeasonalPeriod,
} from "@/lib/seasonal-periods";

export type TravelSeasonFilterValue = "best" | "peak" | "shoulder" | "off" | "any";

export const TRAVEL_MONTH_OPTIONS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
] as const;

export const TRAVEL_SEASON_FILTER_OPTIONS: Array<{
  value: TravelSeasonFilterValue;
  label: string;
  types: string[];
}> = [
  {
    value: "best",
    label: "Best time (peak & shoulder)",
    types: ["HIGH_PEAK_SEASON", "PEAK_SEASON", "SHOULDER_SEASON"],
  },
  { value: "peak", label: "Peak season only", types: ["HIGH_PEAK_SEASON", "PEAK_SEASON"] },
  {
    value: "shoulder",
    label: "Shoulder season only",
    types: ["SHOULDER_SEASON"],
  },
  { value: "off", label: "Off-season deals", types: ["OFF_SEASON"] },
  {
    value: "any",
    label: "Any season",
    types: ["HIGH_PEAK_SEASON", "PEAK_SEASON", "SHOULDER_SEASON", "OFF_SEASON"],
  },
];

export type DbSeasonalPeriod = {
  locationId: string;
  seasonType: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  isActive: boolean;
  name: string;
  id: string;
};

export function parseTravelMonthParam(
  value: string | string[] | undefined
): number | undefined {
  const raw = typeof value === "string" ? value : undefined;
  if (!raw) return undefined;
  const month = Number.parseInt(raw, 10);
  if (!Number.isFinite(month) || month < 1 || month > 12) return undefined;
  return month;
}

export function parseTravelSeasonParam(
  value: string | string[] | undefined
): TravelSeasonFilterValue | undefined {
  const raw = typeof value === "string" ? value : undefined;
  if (!raw) return undefined;
  if (TRAVEL_SEASON_FILTER_OPTIONS.some((o) => o.value === raw)) {
    return raw as TravelSeasonFilterValue;
  }
  return undefined;
}

export function monthMidDate(month: number): Date {
  return new Date(2024, month - 1, 15);
}

export function periodContainsMonth(
  month: number,
  period: Pick<
    DbSeasonalPeriod,
    "startMonth" | "startDay" | "endMonth" | "endDay" | "isActive" | "seasonType" | "name" | "id"
  >
): boolean {
  const asSeasonal: SeasonalPeriod = {
    id: period.id,
    seasonType: period.seasonType as SeasonalPeriod["seasonType"],
    name: period.name,
    startMonth: period.startMonth,
    startDay: period.startDay,
    endMonth: period.endMonth,
    endDay: period.endDay,
    isActive: period.isActive,
  };
  const hit = findSeasonalPeriodForDate(monthMidDate(month), [asSeasonal]);
  return hit?.id === period.id;
}

/**
 * Returns location IDs that match the month + season filter.
 * Locations with no seasonal config are returned in `unconfiguredLocationIds`
 * so callers can optionally include them in package queries.
 */
export function resolveSeasonalLocationFilter(
  periods: DbSeasonalPeriod[],
  month: number,
  season: TravelSeasonFilterValue = "best"
): {
  matchingLocationIds: string[];
  configuredLocationIds: string[];
} {
  const allowedTypes =
    TRAVEL_SEASON_FILTER_OPTIONS.find((o) => o.value === season)?.types ?? [];

  const configuredLocationIds = [
    ...new Set(periods.map((p) => p.locationId)),
  ];

  const matching = new Set<string>();
  for (const locId of configuredLocationIds) {
    const locPeriods = periods.filter((p) => p.locationId === locId);
    const fits = locPeriods.some(
      (p) =>
        p.isActive &&
        allowedTypes.includes(p.seasonType) &&
        periodContainsMonth(month, p)
    );
    if (fits) matching.add(locId);
  }

  return {
    matchingLocationIds: [...matching],
    configuredLocationIds,
  };
}

export function travelMonthLabel(month: number): string {
  return (
    TRAVEL_MONTH_OPTIONS.find((m) => m.value === month)?.label ??
    `Month ${month}`
  );
}
