import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";

async function checkConnectivity(): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      cache: "no-cache",
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function show() {
      if (!mountedRef.current) return;
      setIsVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }

    function hide() {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        if (mountedRef.current) setIsVisible(false);
      });
    }

    let wasOffline = false;

    async function poll() {
      const connected = await checkConnectivity();
      if (!mountedRef.current) return;
      if (!connected && !wasOffline) { wasOffline = true; show(); }
      else if (connected && wasOffline) { wasOffline = false; hide(); }
    }

    poll();
    const interval = setInterval(poll, 8000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [opacity]);

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
