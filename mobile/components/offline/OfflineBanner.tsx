import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { useNetwork } from "@/lib/network";

/**
 * Reads connectivity from the shared NetworkProvider so the banner agrees
 * with the API-client's `requireOnline` gate and the per-screen
 * <OfflineGate />. Falling back to the cached snapshot keeps it functional
 * in tests that don't wrap with the provider.
 */
export function OfflineBanner() {
  const { isOnline } = useNetwork();
  const [dismissed, setDismissed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const visible = !isOnline && !dismissed;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    if (isOnline) setDismissed(false);
  }, [isOnline]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.banner, { opacity }]}
      accessibilityRole="alert"
      testID="offline-banner"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>No internet connection. Some features may be unavailable.</Text>
      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss offline banner"
        testID="offline-banner-dismiss"
      >
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.warning,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    zIndex: 999,
  },
  text: {
    flex: 1,
    fontSize: FontSize.sm,
    color: "#fff",
    fontWeight: "600",
  },
});
