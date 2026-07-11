/**
 * Helpers for hotel comparison display — last itinerary day is typically
 * departure/checkout with no overnight stay.
 */

export interface ItineraryDayRef {
  dayNumber?: number | null;
}

export function getLastItineraryDayNumber(
  itineraries?: ItineraryDayRef[] | null
): number | null {
  if (!itineraries || itineraries.length === 0) return null;

  let maxDay: number | null = null;
  itineraries.forEach((it, index) => {
    const day = it.dayNumber ?? index + 1;
    if (maxDay == null || day > maxDay) {
      maxDay = day;
    }
  });

  return maxDay;
}

export function isLastItineraryDay(
  day: number,
  itineraries?: ItineraryDayRef[] | null
): boolean {
  const lastDay = getLastItineraryDayNumber(itineraries);
  return lastDay != null && day === lastDay;
}

/**
 * Day numbers for hotel comparison rows.
 * Prefer query itineraries (source of truth); fall back to hotel snapshot
 * dayNumbers when itineraries are empty so legacy data still renders.
 */
export function getHotelComparisonDayNumbers(
  itineraries?: ItineraryDayRef[] | null,
  snapshotDayNumbers?: number[] | null
): number[] {
  if (itineraries && itineraries.length > 0) {
    const days = itineraries.map((it, index) => it.dayNumber ?? index + 1);
    return Array.from(new Set(days)).sort((a, b) => a - b);
  }

  if (snapshotDayNumbers && snapshotDayNumbers.length > 0) {
    return Array.from(new Set(snapshotDayNumbers)).sort((a, b) => a - b);
  }

  return [];
}

/** Resolve an itinerary by display day number (supports null dayNumber via index + 1). */
export function findItineraryByDayNumber<T extends ItineraryDayRef>(
  itineraries: T[] | null | undefined,
  day: number
): T | undefined {
  if (!itineraries || itineraries.length === 0) return undefined;
  return itineraries.find((it, index) => (it.dayNumber ?? index + 1) === day);
}
