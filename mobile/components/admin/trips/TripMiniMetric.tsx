import { StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface TripMiniMetricProps {
  label: string;
  value: string;
  testID?: string;
}

export function TripMiniMetric({ label, value, testID }: TripMiniMetricProps) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="text">
      <Text style={styles.value} allowFontScaling={false} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} allowFontScaling={false} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  value: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
