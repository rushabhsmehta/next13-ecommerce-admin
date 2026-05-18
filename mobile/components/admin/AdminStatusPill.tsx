import { StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export type AdminStatusPillVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "muted"
  | "online"
  | "offline";

const variantStyles: Record<AdminStatusPillVariant, { bg: string; fg: string; border: string }> = {
  neutral: { bg: Colors.surfaceAlt, fg: Colors.textSecondary, border: Colors.borderSubtle },
  primary: { bg: Colors.primaryBg, fg: Colors.primary, border: Colors.primaryLight },
  success: { bg: Colors.successBg, fg: Colors.success, border: "#bbf7d0" },
  warning: { bg: Colors.warningBg, fg: Colors.warning, border: "#fde68a" },
  info: { bg: Colors.infoBg, fg: Colors.info, border: "#bfdbfe" },
  danger: { bg: Colors.errorBg, fg: Colors.error, border: "#fecdd3" },
  muted: { bg: Colors.surface, fg: Colors.textTertiary, border: Colors.borderSubtle },
  online: { bg: Colors.successBg, fg: Colors.success, border: "#bbf7d0" },
  offline: { bg: Colors.errorBg, fg: Colors.error, border: "#fecdd3" },
};

export interface AdminStatusPillProps {
  label: string;
  variant?: AdminStatusPillVariant;
  compact?: boolean;
  testID?: string;
}

export function AdminStatusPill({
  label,
  variant = "neutral",
  compact,
  testID,
}: AdminStatusPillProps) {
  const t = variantStyles[variant];
  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.wrap,
        compact ? styles.wrapCompact : null,
        { borderColor: t.border, backgroundColor: t.bg },
      ]}
    >
      <Text
        style={[styles.text, compact ? styles.textCompact : null, { color: t.fg }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  wrapCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  textCompact: {
    fontSize: 10,
    letterSpacing: 0.28,
  },
});
