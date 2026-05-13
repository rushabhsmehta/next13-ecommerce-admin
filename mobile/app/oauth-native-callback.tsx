import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";

/**
 * Handles the deep link returned by Clerk after a social OAuth flow.
 *
 * The `useSSO` hook in `login.tsx` already calls `setActive(...)` once it
 * receives `createdSessionId`. If the OS *also* fires the redirect deep link
 * (`aagamholidays://oauth-native-callback?...`) into Expo Router, this screen
 * silently routes the user home instead of showing the default "Unmatched
 * Route" 404 page.
 */
export default function OAuthNativeCallback() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)");
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
