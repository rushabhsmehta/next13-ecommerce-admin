import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface TripMoreActionRow {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
  accessibilityHint?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export interface TripActionMenuSection {
  title: string;
  rows: TripMoreActionRow[];
}

export interface TripActionMenuProps {
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  sections: TripActionMenuSection[];
  testID?: string;
  /** When true, only the expanded panel is rendered (parent supplies the "More" button). */
  omitToggle?: boolean;
}

/** Collapsible "More actions" with grouped secondary actions. */
export function TripActionMenu({
  expanded,
  onExpandedChange,
  sections,
  testID = "trip-more-actions",
  omitToggle = false,
}: TripActionMenuProps) {
  return (
    <View style={styles.wrap}>
      {!omitToggle ? (
        <Pressable
          testID={`${testID}-toggle`}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Hide more actions" : "More actions"}
          accessibilityHint={
            expanded
              ? "Collapses grouped actions."
              : "Expands grouped share, web, lifecycle, and build actions."
          }
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          onPress={() => onExpandedChange(!expanded)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.text} accessibilityElementsHidden />
          <Text style={styles.toggleText}>More actions</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textTertiary}
            accessibilityElementsHidden
          />
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.panel} accessibilityRole="menu">
          {sections.map((sec) =>
            sec.rows.length ? (
              <View key={sec.title} style={styles.sec}>
                <Text style={styles.secTitle}>{sec.title}</Text>
                <View style={styles.secBody}>
                  {sec.rows.map((row) => (
                    <Pressable
                      key={row.id}
                      testID={row.testID}
                      accessibilityRole="button"
                      accessibilityLabel={row.label}
                      accessibilityHint={row.accessibilityHint}
                      disabled={row.disabled}
                      style={({ pressed }) => [
                        styles.row,
                        row.disabled ? styles.rowDisabled : null,
                        pressed && !row.disabled ? styles.rowPressed : null,
                      ]}
                      onPress={row.onPress}
                    >
                      <Ionicons
                        name={row.icon}
                        size={18}
                        color={row.destructive ? Colors.error : Colors.primary}
                        accessibilityElementsHidden
                      />
                      <Text
                        style={[
                          styles.rowLabel,
                          row.destructive ? styles.rowDestruct : null,
                        ]}
                      >
                        {row.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, marginBottom: Spacing.sm },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
  },
  pressed: { opacity: 0.85 },
  toggleText: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  panel: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  sec: { paddingBottom: Spacing.sm },
  secTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  secBody: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  rowPressed: { backgroundColor: Colors.surfaceAlt },
  rowDisabled: { opacity: 0.45 },
  rowLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: "700", color: Colors.text },
  rowDestruct: { color: Colors.error },
});
