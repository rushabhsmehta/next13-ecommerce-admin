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
