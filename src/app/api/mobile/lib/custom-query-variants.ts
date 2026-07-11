/** Helpers for TourPackageQuery.customQueryVariants JSON. */

export type CustomQueryVariantRow = {
  id: string;
  name: string;
  description: string;
  sortOrder: number | null;
};

export function parseCustomQueryVariants(value: unknown): CustomQueryVariantRow[] {
  if (!Array.isArray(value)) return [];
  const rows: CustomQueryVariantRow[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (item == null || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) continue;
    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : "Custom variant";
    const description =
      typeof record.description === "string" ? record.description : "";
    const sortOrder =
      typeof record.sortOrder === "number" && Number.isFinite(record.sortOrder)
        ? record.sortOrder
        : 1000 + index;
    rows.push({ id, name, description, sortOrder });
  }
  return rows;
}

export function findCustomQueryVariant(
  value: unknown,
  variantId: string
): CustomQueryVariantRow | null {
  return parseCustomQueryVariants(value).find((row) => row.id === variantId) ?? null;
}

export function asJsonRecord(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/** Remove a custom variant id from sibling JSON maps. */
export function stripVariantKeyedMaps(
  maps: {
    variantHotelOverrides?: unknown;
    variantRoomAllocations?: unknown;
    variantTransportDetails?: unknown;
    variantPricingData?: unknown;
  },
  variantId: string
) {
  const next: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(maps)) {
    const record = asJsonRecord(value);
    if (!(variantId in record)) {
      next[field] = value ?? {};
      continue;
    }
    const cloned = { ...record };
    delete cloned[variantId];
    next[field] = cloned;
  }
  return next;
}
