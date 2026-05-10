import * as SecureStore from "expo-secure-store";

const LAST_PACKAGE_KEY = "home_last_package_view_v1";

export type LastViewedPackage = {
  id: string;
  slug: string | null;
  title: string;
};

export async function getLastViewedPackage(): Promise<LastViewedPackage | null> {
  try {
    const raw = await SecureStore.getItemAsync(LAST_PACKAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastViewedPackage;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setLastViewedPackage(pkg: LastViewedPackage): Promise<void> {
  try {
    await SecureStore.setItemAsync(LAST_PACKAGE_KEY, JSON.stringify(pkg));
  } catch {
    // ignore storage failures
  }
}
