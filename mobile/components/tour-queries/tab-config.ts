import type { TourQueryTabId } from "./types";

export interface TourQueryTabOption {
  id: TourQueryTabId;
  label: string;
}

export const TOUR_QUERY_TABS: TourQueryTabOption[] = [
  { id: "basic", label: "Basic" },
  { id: "guests", label: "Guests" },
  { id: "trip", label: "Trip" },
  { id: "itinerary", label: "Itinerary" },
  { id: "hotels", label: "Hotels" },
  { id: "pricing", label: "Pricing" },
  { id: "variants", label: "Variants" },
  { id: "policies", label: "Policies" },
];

export const VARIANT_BUILD_TABS = [
  { id: "hotels" as const, label: "Hotels" },
  { id: "rooms" as const, label: "Room Allocation" },
  { id: "pricing" as const, label: "Pricing" },
];

const TAB_IDS = new Set<string>(TOUR_QUERY_TABS.map((t) => t.id));

export function parseTourQueryTab(value: unknown): TourQueryTabId {
  if (typeof value === "string" && TAB_IDS.has(value)) {
    return value as TourQueryTabId;
  }
  return "basic";
}

/** Map API / validation field paths to the tab that should be shown. */
export function fieldPathToTab(fieldPath: string): TourQueryTabId {
  const lower = fieldPath.toLowerCase();
  if (
    lower.includes("customer") ||
    lower.includes("numadult") ||
    lower.includes("numchild") ||
    lower.includes("numpax")
  ) {
    return "guests";
  }
  if (
    lower.includes("tourstarts") ||
    lower.includes("tourends") ||
    lower.includes("transport") ||
    lower.includes("pickup") ||
    lower.includes("drop") ||
    (lower.includes("location") && !lower.includes("itineraries"))
  ) {
    return "trip";
  }
  if (lower.includes("roomalloc") || lower.includes("hotel") || lower.includes("transportdetail")) {
    return "hotels";
  }
  if (lower.includes("itinerar")) {
    return "itinerary";
  }
  if (lower.includes("pricing") || lower.includes("totalprice") || lower.includes("price")) {
    return "pricing";
  }
  if (lower.includes("variant") || lower.includes("confirmed")) {
    return "variants";
  }
  if (
    lower.includes("inclusion") ||
    lower.includes("exclusion") ||
    lower.includes("policy") ||
    lower.includes("terms") ||
    lower.includes("cancellation")
  ) {
    return "policies";
  }
  if (lower.includes("template") || lower.includes("remark") || lower.includes("tourpackagequeryname")) {
    return "basic";
  }
  return "basic";
}

export function firstTabForFieldErrors(
  fieldErrors: Record<string, string[] | undefined> | undefined
): TourQueryTabId | null {
  if (!fieldErrors) return null;
  for (const field of Object.keys(fieldErrors)) {
    if (fieldErrors[field]?.length) {
      return fieldPathToTab(field);
    }
  }
  return null;
}
