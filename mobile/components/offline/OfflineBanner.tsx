import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import * as Network from "expo-network";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    async function checkNetwork() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!mounted) return;
        const connected = state.isConnected ?? false;
        setIsConnected(connected);

        if (!connected && !isVisible) {
          setIsVisible(true);
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (connected && isVisible) {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (mounted) setIsVisible(false);
          });
        }
      } catch {
        // Network check failed, assume connected
        setIsConnected(true);
      }
    }

    checkNetwork();
    checkInterval = setInterval(checkNetwork, 5000);

    return () => {
      mounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isVisible, opacity]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>No internet connection. Some features may be unavailable.</Text>
      <Pressable onPress={() => setIsVisible(false)} hitSlop={8}>
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