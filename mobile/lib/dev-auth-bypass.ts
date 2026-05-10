import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "mobile_dev_auth_bypass_token_v1";

/**
 * Optional static bearer for local API testing (matches server
 * MOBILE_DEV_AUTH_BYPASS_TOKEN). Stored only in __DEV__ builds.
 */
export async function getDevAuthBypassToken(): Promise<string | null> {
  if (!__DEV__) return null;
  try {
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setDevAuthBypassToken(token: string | null): Promise<void> {
  if (!__DEV__) return;
  try {
    const trimmed = token?.trim();
    if (trimmed) {
      await SecureStore.setItemAsync(STORAGE_KEY, trimmed);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // SecureStore unavailable in some environments
  }
}
