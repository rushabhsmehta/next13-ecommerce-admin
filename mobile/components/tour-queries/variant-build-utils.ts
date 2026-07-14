import type {
  VariantBuildContext,
  VariantBuildDraft,
  VariantComparisonItem,
  VariantRoomAllocationInput,
  VariantTransportDetailInput,
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

export function cloneVariantBuildDraft(draft: VariantBuildDraft): VariantBuildDraft {
  return JSON.parse(JSON.stringify(draft)) as VariantBuildDraft;
}

export function createVariantBuildDraft(
  variant: VariantComparisonItem,
  build: VariantBuildContext
): VariantBuildDraft {
  const keys = variantDataKeys(variant);
  const roomsByItinerary = findNestedRecord(build.variantRoomAllocations, keys);
  const transportByItinerary = findNestedRecord(build.variantTransportDetails, keys);
  const hotelsByItinerary = findNestedRecord(build.variantHotelOverrides, keys);
  const draft: VariantBuildDraft = {
    roomsByItinerary: {},
    transportByItinerary: {},
    hotelsByItinerary: {},
  };

  for (const itinerary of build.itineraries) {
    const rooms = roomsByItinerary[itinerary.id];
    const transport = transportByItinerary[itinerary.id];
    draft.roomsByItinerary[itinerary.id] = Array.isArray(rooms)
      ? (JSON.parse(JSON.stringify(rooms)) as VariantRoomAllocationInput[])
      : [];
    draft.transportByItinerary[itinerary.id] = Array.isArray(transport)
      ? (JSON.parse(JSON.stringify(transport)) as VariantTransportDetailInput[])
      : [];

    const overrideHotelId = hotelsByItinerary[itinerary.id];
    if (typeof overrideHotelId === "string") {
      draft.hotelsByItinerary[itinerary.id] = overrideHotelId;
    } else {
      const snap = variant.hotelSnapshots.find(
        (row) => row.dayNumber === (itinerary.dayNumber ?? -1)
      );
      draft.hotelsByItinerary[itinerary.id] =
        snap?.hotelId ?? itinerary.hotel?.id ?? "";
    }
  }

  return draft;
}

export function copyFirstDayRoomsAndTransportToAllDays(
  draft: VariantBuildDraft,
  itineraryIds: string[]
): VariantBuildDraft {
  if (itineraryIds.length === 0) return cloneVariantBuildDraft(draft);
  const firstId = itineraryIds[0];
  const firstRooms = draft.roomsByItinerary[firstId] ?? [];
  const firstTransport = draft.transportByItinerary[firstId] ?? [];
  const next = cloneVariantBuildDraft(draft);

  for (const itineraryId of itineraryIds) {
    next.roomsByItinerary[itineraryId] = JSON.parse(
      JSON.stringify(firstRooms)
    ) as VariantRoomAllocationInput[];
    next.transportByItinerary[itineraryId] = JSON.parse(
      JSON.stringify(firstTransport)
    ) as VariantTransportDetailInput[];
  }

  return next;
}

export function copyFirstDayHotelToAllDays(
  draft: VariantBuildDraft,
  itineraryIds: string[]
): VariantBuildDraft {
  if (itineraryIds.length === 0) return cloneVariantBuildDraft(draft);
  const firstId = itineraryIds[0];
  const firstHotel = draft.hotelsByItinerary[firstId] ?? "";
  const next = cloneVariantBuildDraft(draft);

  for (const itineraryId of itineraryIds) {
    next.hotelsByItinerary[itineraryId] = firstHotel;
  }

  return next;
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

/** Resolve display name from draft hotel id + optional name cache. */
export function resolveDraftHotelName(
  hotelId: string | undefined,
  options: {
    hotels?: Array<{ id: string; name: string }>;
    variant: VariantComparisonItem;
    build: VariantBuildContext;
    itineraryId: string;
    dayNumber: number | null;
    fallbackHotel: { id: string; name: string } | null;
  }
): string {
  if (hotelId === "") return "No hotel selected";
  if (typeof hotelId === "string" && hotelId) {
    const cached = options.hotels?.find((hotel) => hotel.id === hotelId);
    if (cached?.name) return cached.name;
    const snap = options.variant.hotelSnapshots.find((row) => row.hotelId === hotelId);
    if (snap?.hotelName) return snap.hotelName;
    if (options.fallbackHotel?.id === hotelId) return options.fallbackHotel.name;
  }
  return resolveVariantHotelName(
    options.variant,
    options.build,
    options.itineraryId,
    options.dayNumber,
    options.fallbackHotel
  );
}

export function isHotelOverridden(
  variant: VariantComparisonItem,
  build: VariantBuildContext,
  itineraryId: string
): boolean {
  const overrides = findNestedRecord(build.variantHotelOverrides, variantDataKeys(variant));
  return overrides[itineraryId] !== undefined;
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
