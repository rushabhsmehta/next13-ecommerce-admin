import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminFormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  testID?: string;
}

export function AdminFormSection({ title, description, children, testID }: AdminFormSectionProps) {
  return (
    <View style={styles.section} testID={testID} accessibilityRole="none">
      <Text style={styles.title} accessibilityRole="header" allowFontScaling={false}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description} allowFontScaling={false}>
          {description}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    lineHeight: 16,
  },
  body: { gap: Spacing.md },
});
