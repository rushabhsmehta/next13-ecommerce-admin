import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { getAppVersionInfo } from "@/lib/app-version";

type AppVersionFooterProps = {
  /** Show runtime / OTA lines below the main label. */
  detailed?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppVersionFooter({
  detailed = false,
  testID = "app-version-footer",
  style,
}: AppVersionFooterProps) {
  const info = useMemo(() => getAppVersionInfo(), []);

  return (
    <View
      style={[styles.wrap, style]}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`App version ${info.shortLabel}`}
    >
      <Text style={styles.primary} testID={`${testID}-label`}>
        {info.shortLabel}
      </Text>
      {detailed
        ? info.detailLines.slice(1).map((line) => (
            <Text key={line} style={styles.secondary}>
              {line}
            </Text>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: 2,
  },
  primary: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
  secondary: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    opacity: 0.85,
  },
});
