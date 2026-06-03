import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { getPostLoginRoute } from "@/lib/app-variant";

/**
 * Handles legacy deep links returned by Clerk after a browser OAuth flow.
 *
 * Native Google sign-in now uses Clerk's Google hook without this route. If a
 * browser OAuth fallback ever fires the redirect deep link
 * (`<active-app-scheme>://oauth-native-callback?...`) into Expo Router, this screen
 * silently routes the user home instead of showing the default "Unmatched
 * Route" 404 page.
 */
export default function OAuthNativeCallback() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(getPostLoginRoute() as never);
    }, 50);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
});
