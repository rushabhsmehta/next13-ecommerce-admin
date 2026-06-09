export const TRAVEL_SAVED_PACKAGES_KEY = "travel-saved-packages";
const MAX_SAVED_PACKAGES = 50;

export const MAX_COMPARE_PACKAGES = 3;

export type TravelSavedPackage = {
  id: string;
  slug?: string | null;
  name?: string | null;
  locationLabel?: string | null;
  duration?: string | null;
  imageUrl?: string | null;
  tourCategory?: string | null;
  savedAt?: number;
};

function normalizeSavedPackages(raw: string | null): TravelSavedPackage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id)
      .map((item) => ({
        id: String(item.id),
        slug: item.slug ?? null,
        name: item.name ?? item.tourPackageName ?? null,
        locationLabel: item.locationLabel ?? null,
        duration: item.duration ?? item.numDaysNight ?? null,
        imageUrl: item.imageUrl ?? null,
        tourCategory: item.tourCategory ?? null,
        savedAt: typeof item.savedAt === "number" ? item.savedAt : undefined,
      }));
  } catch {
    return [];
  }
}

export function getSavedPackages(): TravelSavedPackage[] {
  if (typeof window === "undefined") return [];
  return normalizeSavedPackages(localStorage.getItem(TRAVEL_SAVED_PACKAGES_KEY));
}

export function getSavedPackageIds(): string[] {
  return getSavedPackages().map((pkg) => pkg.id);
}

export function isPackageSaved(id: string): boolean {
  return getSavedPackageIds().includes(id);
}

function writeSavedPackages(packages: TravelSavedPackage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    TRAVEL_SAVED_PACKAGES_KEY,
    JSON.stringify(packages.slice(0, MAX_SAVED_PACKAGES))
  );
  window.dispatchEvent(new CustomEvent("travel-saved-changed"));
}

export function savePackage(
  pkg: Omit<TravelSavedPackage, "savedAt">
): TravelSavedPackage[] {
  const saved = getSavedPackages();
  const next: TravelSavedPackage = {
    ...pkg,
    savedAt: Date.now(),
  };
  const withoutExisting = saved.filter((item) => item.id !== pkg.id);
  const packages = [next, ...withoutExisting];
  writeSavedPackages(packages);
  return packages;
}

export function removeSavedPackage(id: string): TravelSavedPackage[] {
  const packages = getSavedPackages().filter((pkg) => pkg.id !== id);
  writeSavedPackages(packages);
  return packages;
}

export function toggleSavedPackage(pkg: {
  id: string;
  slug?: string | null;
  tourPackageName?: string | null;
  name?: string | null;
  locationLabel?: string | null;
  location?: { label?: string | null } | null;
  numDaysNight?: string | null;
  duration?: string | null;
  imageUrl?: string | null;
  images?: { url: string }[] | null;
  tourCategory?: string | null;
}): boolean {
  const saved = getSavedPackages();
  const idx = saved.findIndex((p) => p.id === pkg.id);
  if (idx >= 0) {
    saved.splice(idx, 1);
    writeSavedPackages(saved);
    return false;
  }
  savePackage({
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.tourPackageName ?? pkg.name,
    locationLabel: pkg.locationLabel ?? pkg.location?.label ?? null,
    duration: pkg.duration ?? pkg.numDaysNight ?? null,
    imageUrl: pkg.imageUrl ?? pkg.images?.[0]?.url ?? null,
    tourCategory: pkg.tourCategory ?? null,
  });
  return true;
}

export async function syncSavedPackagesToServer(): Promise<void> {
  const local = getSavedPackages();
  if (!local.length) return;

  await Promise.all(
    local.map((pkg) =>
      fetch("/api/travel-auth/saved-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourPackageId: pkg.id }),
      }).catch(() => null)
    )
  );
}
