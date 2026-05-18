import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminLoadingStateProps {
  label?: string;
  testID?: string;
}

export function AdminLoadingState({
  label = "Loading…",
  testID = "admin-loading-state",
}: AdminLoadingStateProps) {
  return (
    <View style={styles.root} testID={testID} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.label} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
