/**
 * Remap variant JSON column keys from client-side itinerary IDs to DB itinerary UUIDs.
 * Used on tour package query create (POST) and update (PATCH) after itineraries are inserted.
 */
export function remapVariantDataKeys(
  variantData: unknown,
  idMap: Record<string, string>
): unknown {
  if (!variantData || typeof variantData !== "object") return variantData;
  const remapped: Record<string, Record<string, unknown>> = {};
  for (const variantId in variantData as Record<string, unknown>) {
    const variantEntry = (variantData as Record<string, unknown>)[variantId];
    if (typeof variantEntry !== "object" || variantEntry === null) continue;
    remapped[variantId] = {};
    for (const oldItin in variantEntry as Record<string, unknown>) {
      const newItin = idMap[oldItin] || oldItin;
      remapped[variantId][newItin] = (variantEntry as Record<string, unknown>)[oldItin];
    }
  }
  return remapped;
}

export type ItineraryIdMappingInput = {
  id?: string;
  dayNumber?: number | null;
};

export type CreatedItineraryRef = {
  oldId?: string;
  newId: string;
  dayNumber?: number | null;
};

/** Build old client key → new DB UUID map (includes dayNumber string fallback). */
export function buildItineraryIdMap(created: CreatedItineraryRef[]): Record<string, string> {
  const itineraryIdMap: Record<string, string> = {};
  for (const item of created) {
    if (item.oldId && item.newId) {
      itineraryIdMap[item.oldId] = item.newId;
    }
    if (item.newId && typeof item.dayNumber === "number") {
      itineraryIdMap[String(item.dayNumber)] = item.newId;
    }
  }
  return itineraryIdMap;
}
