import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Spacing } from "@/constants/theme";

export interface AppHeaderProps {
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  /** When true, renders translucent buttons over a hero image. */
  overlay?: boolean;
}

export function AppHeader({
  onBack,
  onShare,
  onSave,
  isSaved = false,
  overlay = true,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const buttonStyle = overlay ? styles.overlayButton : styles.solidButton;
  const iconColor = overlay ? "#fff" : "#1c1917";

  return (
    <View
      style={[styles.container, { paddingTop: Math.max(insets.top, 8) + 4 }]}
      pointerEvents="box-none"
    >
      {onBack ? (
        <Pressable
          testID="app-header-back"
          onPress={onBack}
          style={buttonStyle}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={iconColor} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.rightCluster}>
        {onShare && (
          <Pressable
            testID="app-header-share"
            onPress={onShare}
            style={buttonStyle}
            accessibilityRole="button"
            accessibilityLabel="Share package"
            accessibilityHint="Opens share sheet"
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={18} color={iconColor} />
          </Pressable>
        )}
        {onSave && (
          <Pressable
            testID="app-header-save"
            onPress={onSave}
            style={buttonStyle}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? "Remove from saved" : "Save package"}
            accessibilityState={{ selected: isSaved }}
            hitSlop={8}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={18}
              color={isSaved ? "#ef4444" : iconColor}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  spacer: { width: 38, height: 38 },
  rightCluster: { flexDirection: "row", gap: Spacing.sm },
  overlayButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    alignItems: "center",
  },
  solidButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
});
