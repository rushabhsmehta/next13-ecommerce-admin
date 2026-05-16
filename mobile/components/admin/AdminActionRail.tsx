import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminRailAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress: () => void;
}

const DEFAULT_TILE_WIDTH = 92;
const COMPACT_TILE_WIDTH = 72;

export interface AdminActionRailProps {
  actions: AdminRailAction[];
  testIDPrefix?: string;
  tileWidth?: number;
  /** Calmer rails: narrower tiles, no shadow, tighter labels */
  compact?: boolean;
  /** Prefer one row — flexes items (ideal with ≤5 actions) */
  singleRow?: boolean;
}

export function AdminActionRail({
  actions,
  testIDPrefix = "admin-action",
  tileWidth,
  compact = false,
  singleRow = false,
}: AdminActionRailProps) {
  const slice = compact ? actions.slice(0, 5) : actions;
  if (!slice.length) return null;

  const resolvedWidth = tileWidth ?? (compact ? COMPACT_TILE_WIDTH : DEFAULT_TILE_WIDTH);
  const iconSize = 20;

  const tileStyle = ({ pressed }: { pressed: boolean }) =>
    [
      compact ? styles.tileCompact : styles.tileDefault,
      pressed && styles.tilePressed,
      singleRow ? styles.tileGrow : { width: resolvedWidth },
      !singleRow && !compact ? styles.tileTallMin : compact ? styles.tileShortMin : null,
    ].filter(Boolean) as object[];

  const cells = slice.map((action) => (
    <Pressable
      key={action.id}
      testID={`${testIDPrefix}-${action.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open ${action.title}`}
      accessibilityHint="Navigates to the selected workspace."
      onPress={action.onPress}
      style={tileStyle}
    >
      <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
        <Ionicons
          name={action.icon}
          size={iconSize}
          color={action.iconColor ?? Colors.primary}
          accessibilityElementsHidden
        />
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]} allowFontScaling={false} numberOfLines={2}>
        {action.title}
      </Text>
    </Pressable>
  ));

  if (singleRow) {
    return (
      <View style={styles.singleRowOuter} accessibilityRole="toolbar" accessibilityLabel="Shortcuts">
        {cells}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.track, compact && styles.trackDense]}
      accessibilityRole="menu"
      accessibilityLabel="Shortcuts"
    >
      {cells}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: Spacing.sm,
    paddingVertical: 2,
    alignItems: "stretch",
    paddingHorizontal: Spacing.xs,
    marginHorizontal: Spacing.sm,
  },
  trackDense: {
    paddingHorizontal: 0,
    marginHorizontal: Spacing.sm,
  },
  singleRowOuter: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  tileDefault: {
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
  },
  tileTallMin: { minHeight: 96 },
  tileCompact: {
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.sm - 4,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs + 2,
  },
  tileShortMin: { minHeight: 72 },
  tileGrow: {
    flex: 1,
    minWidth: 64,
    maxWidth: 112,
  },
  tilePressed: {
    opacity: 0.88,
    backgroundColor: Colors.surfaceAlt,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapCompact: {
    width: 38,
    height: 38,
  },
  label: {
    fontSize: FontSize.xs,
    lineHeight: 15,
    color: Colors.text,
    fontWeight: "900",
    textAlign: "center",
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
  },
});
