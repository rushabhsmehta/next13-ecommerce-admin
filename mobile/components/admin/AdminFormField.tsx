import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  testID?: string;
}

export function AdminFormField({
  label,
  required,
  error,
  hint,
  children,
  testID,
}: AdminFormFieldProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.label} allowFontScaling={false}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert" allowFontScaling={false}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint} allowFontScaling={false}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  required: { color: Colors.error },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: "600",
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
});
