/** Trim, lowercase, and collapse hyphens for URL slug segments. */
export function normalizeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const cleaned = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || null;
}

/** @deprecated Use normalizeSlug */
export const normalizeLocationSlug = normalizeSlug;

/** Normalize a manual slug or derive one from a display name. */
export function normalizeSlugInput(
  slug: string | null | undefined,
  fallbackName?: string | null
): string | null {
  const fromSlug = normalizeSlug(slug);
  if (fromSlug) return fromSlug;
  if (!fallbackName) return null;
  return normalizeSlug(fallbackName);
}

/** Tour package slugs are capped at 80 characters. */
export function normalizeTourPackageSlugInput(
  slug: string | null | undefined,
  packageName?: string | null
): string | null {
  const fromSlug = normalizeSlug(slug)?.slice(0, 80);
  if (fromSlug) return fromSlug;
  if (!packageName?.trim()) return null;
  return normalizeSlug(packageName)?.slice(0, 80) || null;
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
