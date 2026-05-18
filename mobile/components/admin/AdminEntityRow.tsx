import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminEntityRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Leading icon inside a compact square */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trailing?: ReactNode;
  statusLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
  accessibilityHint?: string;
}

export function AdminEntityRow({
  title,
  subtitle,
  meta,
  icon,
  iconColor = Colors.primary,
  trailing,
  statusLabel,
  onPress,
  onLongPress,
  disabled,
  busy,
  testID,
  accessibilityHint,
}: AdminEntityRowProps) {
  const interactive = !!onPress && !disabled;

  const content = (
    <>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={iconColor} accessibilityElementsHidden />
        </View>
      ) : null}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>
            {title}
          </Text>
          {statusLabel ? (
            <View style={styles.statusPill}>
              <Text style={styles.statusText} allowFontScaling={false}>
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2} allowFontScaling={false}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1} allowFontScaling={false}>
            {meta}
          </Text>
        ) : null}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={Colors.primary} accessibilityLabel="Loading" />
      ) : trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : interactive ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} accessibilityElementsHidden />
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <View
        testID={testID}
        style={[styles.row, disabled && styles.rowDisabled]}
        accessibilityRole="text"
        accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(". ")}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint ?? (subtitle ? subtitle : undefined)}
      disabled={disabled || busy}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    minHeight: 56,
  },
  rowPressed: { backgroundColor: Colors.surfaceAlt },
  rowDisabled: { opacity: 0.5 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  trailing: { marginLeft: Spacing.xs },
});
