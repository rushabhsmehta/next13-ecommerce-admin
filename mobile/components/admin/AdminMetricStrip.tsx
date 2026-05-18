import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminMetricStripItem {
  id: string;
  label: string;
  value: string | number;
  attention?: boolean;
  onPress?: () => void;
}

export interface AdminMetricStripProps {
  items: AdminMetricStripItem[];
  testID?: string;
}

export function AdminMetricStrip({ items, testID = "admin-metric-strip" }: AdminMetricStripProps) {
  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel="Key metrics"
    >
      {items.map((item) => {
        const valueText = typeof item.value === "number" ? item.value.toLocaleString("en-IN") : item.value;
        const inner = (
          <>
            <Text style={styles.value} allowFontScaling={false}>
              {valueText}
            </Text>
            <Text style={styles.label} numberOfLines={2} allowFontScaling={false}>
              {item.label}
            </Text>
            {item.attention ? <View style={styles.dot} accessibilityLabel="Needs attention" /> : null}
          </>
        );

        if (item.onPress) {
          return (
            <Pressable
              key={item.id}
              testID={`${testID}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${valueText}`}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.chip,
                item.attention && styles.chipAttention,
                pressed && styles.chipPressed,
              ]}
            >
              {inner}
            </Pressable>
          );
        }

        return (
          <View
            key={item.id}
            testID={`${testID}-${item.id}`}
            style={[styles.chip, item.attention && styles.chipAttention]}
            accessibilityRole="text"
            accessibilityLabel={`${item.label}, ${valueText}`}
          >
            {inner}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
  },
  chip: {
    minWidth: 96,
    maxWidth: 140,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    gap: 2,
  },
  chipAttention: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  chipPressed: { opacity: 0.9 },
  value: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
});
