import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import { APP_SCHEME } from "@/lib/app-variant";

/** Deep-link path registered in Expo Router (`app/oauth-native-callback.tsx`). */
export const CLERK_OAUTH_CALLBACK_PATH = "oauth-native-callback";

function resolveAppScheme(): string {
  if (typeof Constants.expoConfig?.scheme === "string" && Constants.expoConfig.scheme.length > 0) {
    return Constants.expoConfig.scheme;
  }
  return APP_SCHEME;
}

/**
 * Legacy redirect URL for browser OAuth callbacks.
 * Native Google sign-in uses `@clerk/expo/google` and does not need this URL.
 * `AuthSession.makeRedirectUri` can return an empty string on some release builds;
 * we always fall back to `<scheme>://oauth-native-callback`.
 */
export function getClerkOAuthRedirectUrl(): string {
  const scheme = resolveAppScheme();
  const explicit = `${scheme}://${CLERK_OAUTH_CALLBACK_PATH}`;

  try {
    const fromLinking = Linking.createURL(CLERK_OAUTH_CALLBACK_PATH);
    if (fromLinking.includes("://")) {
      return fromLinking;
    }
  } catch {
    // ignore
  }

  try {
    const fromAuthSession = AuthSession.makeRedirectUri({
      scheme,
      path: CLERK_OAUTH_CALLBACK_PATH,
      preferLocalhost: false,
    });
    if (fromAuthSession.includes("://")) {
      return fromAuthSession;
    }
  } catch {
    // ignore
  }

  return explicit;
}
