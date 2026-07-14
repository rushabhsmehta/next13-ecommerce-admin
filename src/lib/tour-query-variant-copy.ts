type RowsByVariant = Record<string, Record<string, any[]>>;
type HotelOverridesByVariant = Record<string, Record<string, string>>;

export type VariantCopyItinerary = {
  id?: string | null;
};

function itineraryIds(itineraries: VariantCopyItinerary[]): string[] {
  return itineraries
    .map((itinerary) => itinerary.id)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

function cloneRows<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows)) as T[];
}

export function copyFirstDayRoomsAndTransportForVariant({
  variantId,
  itineraries,
  variantRoomAllocations,
  variantTransportDetails,
}: {
  variantId: string;
  itineraries: VariantCopyItinerary[];
  variantRoomAllocations?: RowsByVariant;
  variantTransportDetails?: RowsByVariant;
}) {
  const ids = itineraryIds(itineraries);
  if (ids.length === 0) return null;

  const currentRooms = variantRoomAllocations || {};
  const roomVariantData = currentRooms[variantId] || {};
  const currentTransport = variantTransportDetails || {};
  const transportVariantData = currentTransport[variantId] || {};
  const firstId = ids[0];
  const firstDayRooms = roomVariantData[firstId] || [];
  const firstDayTransports = transportVariantData[firstId] || [];
  const nextRooms = { ...roomVariantData };
  const nextTransport = { ...transportVariantData };

  for (const id of ids) {
    nextRooms[id] = cloneRows(firstDayRooms);
    nextTransport[id] = cloneRows(firstDayTransports);
  }

  return {
    firstDayRooms,
    firstDayTransports,
    copiedDayCount: ids.length,
    variantRoomAllocations: {
      ...currentRooms,
      [variantId]: nextRooms,
    },
    variantTransportDetails: {
      ...currentTransport,
      [variantId]: nextTransport,
    },
  };
}

export function copyFirstDayHotelForVariant({
  variantId,
  itineraries,
  variantHotelOverrides,
  hotelId,
}: {
  variantId: string;
  itineraries: VariantCopyItinerary[];
  variantHotelOverrides?: HotelOverridesByVariant;
  hotelId: string;
}) {
  const ids = itineraryIds(itineraries);
  if (ids.length === 0) return null;

  const currentOverrides = variantHotelOverrides || {};
  const nextOverrides = { ...(currentOverrides[variantId] || {}) };

  for (const id of ids) {
    nextOverrides[id] = hotelId;
  }

  return {
    copiedDayCount: ids.length,
    variantHotelOverrides: {
      ...currentOverrides,
      [variantId]: nextOverrides,
    },
  };
}
