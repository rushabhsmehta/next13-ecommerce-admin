/** Trim and collapse hyphens for location URL segments. */
export function normalizeLocationSlug(
  slug: string | null | undefined
): string | null {
  if (!slug) return null;
  const cleaned = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || null;
}

/** URL path segment for a location destination page (slug preferred, else id). */
export function locationDestinationSegment(location: {
  id: string;
  slug?: string | null;
}): string {
  return normalizeLocationSlug(location.slug) ?? location.id;
}

export function locationDestinationPath(location: {
  id: string;
  slug?: string | null;
}): string {
  return `/destinations/${locationDestinationSegment(location)}`;
}

/** Candidate slug values for DB lookup (handles legacy trailing-hyphen slugs). */
export function locationSlugLookupCandidates(param: string): string[] {
  const trimmed = param.trim();
  const candidates = new Set<string>([trimmed]);

  const normalized = normalizeLocationSlug(trimmed);
  if (normalized) {
    candidates.add(normalized);
    candidates.add(`${normalized}-`);
  }

  return [...candidates];
}
