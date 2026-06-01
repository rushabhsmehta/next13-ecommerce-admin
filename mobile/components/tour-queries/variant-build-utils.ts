import type {
  VariantBuildContext,
  VariantComparisonItem,
} from "@/lib/tour-query-pricing";

function asRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function variantDataKeys(variant: VariantComparisonItem): string[] {
  return [variant.sourceVariantId, variant.id].filter((key): key is string => Boolean(key));
}

export function findNestedRecord(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  for (const key of keys) {
    const candidate = source[key];
    if (candidate != null && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return {};
}

export function resolveVariantHotelName(
  variant: VariantComparisonItem,
  build: VariantBuildContext,
  itineraryId: string,
  dayNumber: number | null,
  fallbackHotel: { id: string; name: string } | null
): string {
  const keys = variantDataKeys(variant);
  const overrides = findNestedRecord(build.variantHotelOverrides, keys);
  const overrideHotelId = overrides[itineraryId];
  if (typeof overrideHotelId === "string" && overrideHotelId) {
    const snap = variant.hotelSnapshots.find((row) => row.hotelId === overrideHotelId);
    if (snap?.hotelName) return snap.hotelName;
  }
  const snap = variant.hotelSnapshots.find((row) => row.dayNumber === (dayNumber ?? -1));
  if (snap?.hotelName) return snap.hotelName;
  return fallbackHotel?.name ?? "No hotel selected";
}

export function resolveVariantRooms(
  variant: VariantComparisonItem,
  build: VariantBuildContext,
  itineraryId: string
) {
  const roomsByItinerary = findNestedRecord(build.variantRoomAllocations, variantDataKeys(variant));
  const rows = roomsByItinerary[itineraryId];
  return Array.isArray(rows) ? rows : [];
}

export function resolveVariantTransport(
  variant: VariantComparisonItem,
  build: VariantBuildContext,
  itineraryId: string
) {
  const transportByItinerary = findNestedRecord(
    build.variantTransportDetails,
    variantDataKeys(variant)
  );
  const rows = transportByItinerary[itineraryId];
  return Array.isArray(rows) ? rows : [];
}

export function lookupName(
  items: Array<{ id: string; name: string }>,
  id: unknown
): string {
  if (typeof id !== "string" || !id) return "—";
  return items.find((item) => item.id === id)?.name ?? id.slice(0, 8);
}

export function formatRoomAllocationLine(
  row: Record<string, unknown>,
  build: VariantBuildContext
): string {
  const qty = Number(row.quantity ?? 1) || 1;
  const roomType = lookupName(build.lookups.roomTypes, row.roomTypeId);
  const occupancy = lookupName(build.lookups.occupancyTypes, row.occupancyTypeId);
  const mealPlan = lookupName(build.lookups.mealPlans, row.mealPlanId);
  const custom = typeof row.customRoomType === "string" ? row.customRoomType.trim() : "";
  const label = custom || roomType;
  return `${qty}× ${label} (${occupancy}${mealPlan !== "—" ? ` · ${mealPlan}` : ""})`;
}

export function formatTransportLine(
  row: Record<string, unknown>,
  build: VariantBuildContext
): string {
  const qty = Number(row.quantity ?? 1) || 1;
  const vehicle = lookupName(build.lookups.vehicleTypes, row.vehicleTypeId);
  const description = typeof row.description === "string" ? row.description.trim() : "";
  return description ? `${qty}× ${vehicle}: ${description}` : `${qty}× ${vehicle}`;
}
