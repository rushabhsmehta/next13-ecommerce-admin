/**
 * Helpers for aligning variant display with active query variant selection.
 * Edit UI uses selectedVariantIds / customQueryVariants; display pages must
 * not show stale queryVariantSnapshots when no variants are active.
 */

export function parseSelectedVariantIds(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parseSelectedVariantIds(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function parseCustomQueryVariantIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => (entry && typeof entry === "object" ? (entry as { id?: string }).id : undefined))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function getActiveVariantIds(query: {
  selectedVariantIds?: unknown;
  customQueryVariants?: unknown;
}): string[] {
  const ids = new Set<string>([
    ...parseSelectedVariantIds(query.selectedVariantIds),
    ...parseCustomQueryVariantIds(query.customQueryVariants),
  ]);
  return Array.from(ids);
}

export function filterVariantSnapshotsForDisplay<T extends { id?: string; sourceVariantId?: string | null }>(
  snapshots: T[] | null | undefined,
  activeVariantIds: string[]
): T[] {
  if (!snapshots?.length || activeVariantIds.length === 0) {
    return [];
  }
  const activeSet = new Set(activeVariantIds);
  return snapshots.filter((snapshot) => {
    const sourceId = snapshot.sourceVariantId ?? "";
    const snapshotId = snapshot.id ?? "";
    return activeSet.has(sourceId) || activeSet.has(snapshotId);
  });
}
