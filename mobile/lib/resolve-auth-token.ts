import { getDevAuthBypassToken } from "@/lib/dev-auth-bypass";

/** Prefer dev bypass token (if set) over Clerk session JWT. */
export async function resolveMobileAuthToken(
  getToken: () => Promise<string | null>
): Promise<string | null> {
  if (__DEV__) {
    const bypass = await getDevAuthBypassToken();
    if (bypass) return bypass;
  }
  return getToken();
}
