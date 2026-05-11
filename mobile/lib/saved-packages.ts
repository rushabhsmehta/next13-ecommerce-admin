import * as SecureStore from "expo-secure-store";

const SAVED_PACKAGES_KEY = "saved_packages_v1";
const MAX_SAVED_PACKAGES = 50;

export type SavedPackage = {
  id: string;
  slug: string | null;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  locationLabel?: string | null;
  duration?: string | null;
  price?: string | null;
  savedAt: number;
};

function normalizeSavedPackages(raw: string | null): SavedPackage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedPackage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((pkg) => !!pkg?.id && !!pkg?.title);
  } catch {
    return [];
  }
}

async function writeSavedPackages(packages: SavedPackage[]): Promise<void> {
  await SecureStore.setItemAsync(
    SAVED_PACKAGES_KEY,
    JSON.stringify(packages.slice(0, MAX_SAVED_PACKAGES))
  );
}

export async function getSavedPackages(): Promise<SavedPackage[]> {
  try {
    return normalizeSavedPackages(await SecureStore.getItemAsync(SAVED_PACKAGES_KEY));
  } catch {
    return [];
  }
}

export async function isPackageSaved(id: string): Promise<boolean> {
  const saved = await getSavedPackages();
  return saved.some((pkg) => pkg.id === id);
}

export async function savePackage(pkg: Omit<SavedPackage, "savedAt">): Promise<SavedPackage[]> {
  const saved = await getSavedPackages();
  const next: SavedPackage = { ...pkg, savedAt: Date.now() };
  const withoutExisting = saved.filter((item) => item.id !== pkg.id);
  const packages = [next, ...withoutExisting];
  await writeSavedPackages(packages);
  return packages;
}

export async function removeSavedPackage(id: string): Promise<SavedPackage[]> {
  const saved = await getSavedPackages();
  const packages = saved.filter((pkg) => pkg.id !== id);
  await writeSavedPackages(packages);
  return packages;
}

