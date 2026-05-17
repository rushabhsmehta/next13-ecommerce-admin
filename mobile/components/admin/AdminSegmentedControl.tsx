import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminSegmentOption<T extends string> {
  id: T;
  label: string;
}

export interface AdminSegmentedControlProps<T extends string> {
  options: AdminSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
  scrollable?: boolean;
}

export function AdminSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix = "admin-segment",
  scrollable = true,
}: AdminSegmentedControlProps<T>) {
  const cells = options.map((opt) => {
    const active = value === opt.id;
    return (
      <Pressable
        key={opt.id}
        testID={`${testIDPrefix}-${opt.id}`}
        accessibilityRole="button"
        accessibilityLabel={opt.label}
        accessibilityState={{ selected: active }}
        onPress={() => onChange(opt.id)}
        style={[styles.segment, active && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, active && styles.segmentTextActive]} allowFontScaling={false}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (!scrollable) {
    return (
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {cells}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {cells}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Horizontal ScrollViews stretch to fill a flex-column parent's height
  // unless constrained; flexGrow:0 makes it wrap its content instead.
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  segment: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  segmentActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.primaryDark,
    fontWeight: "800",
  },
});
