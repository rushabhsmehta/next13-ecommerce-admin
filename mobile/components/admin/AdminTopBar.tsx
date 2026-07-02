import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { AdminStatusPill } from "./AdminStatusPill";

export interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  backAccessibilityLabel?: string;
  rightSlot?: ReactNode;
  /** Role, offline, or custom badges rendered under the title row */
  badges?: { id: string; label: string; variant?: "neutral" | "warning" | "offline" }[];
  testID?: string;
}

export function AdminTopBar({
  title,
  subtitle,
  onBackPress,
  backAccessibilityLabel = "Go back",
  rightSlot,
  badges,
  testID = "admin-top-bar",
}: AdminTopBarProps) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="header">
      <View style={styles.accent} accessibilityElementsHidden />
      <View style={styles.row}>
        {onBackPress ? (
          <Pressable
            testID={`${testID}-back`}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            accessibilityHint="Returns to the previous screen."
            onPress={onBackPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} accessibilityElementsHidden />
          </Pressable>
        ) : null}
        <View style={[styles.titleBlock, !onBackPress && styles.titleInset]}>
          <Text style={styles.title} allowFontScaling={false}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} allowFontScaling={false}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {badges?.length ? (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <AdminStatusPill
              key={b.id}
              label={b.label}
              variant={b.variant ?? "neutral"}
              compact
              testID={`${testID}-badge-${b.id}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function AdminTopBarIconButton(props: {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  accessibilityLabel?: string;
  hint?: string;
  testID?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label ?? "Action"}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.pressed,
        props.disabled && styles.disabled,
      ]}
    >
      <Ionicons name={props.icon} size={18} color={Colors.text} accessibilityElementsHidden />
    </Pressable>
  );
}

export function AdminTopBarPrimaryButton(props: {
  label: string;
  testID?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.accessibilityHint}
      onPress={props.onPress}
      style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
    >
      {props.icon ? (
        <Ionicons name={props.icon} size={16} color={Colors.textInverse} accessibilityElementsHidden />
      ) : null}
      <Text style={styles.primaryBtnText} allowFontScaling={false}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  accent: {
    height: 2,
    width: 40,
    borderRadius: 1,
    backgroundColor: Colors.primary,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 40,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.78, backgroundColor: Colors.surfaceAlt },
  disabled: { opacity: 0.45 },
  titleBlock: { flex: 1, gap: 2 },
  titleInset: { paddingLeft: 2 },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    color: Colors.textInverse,
    fontSize: FontSize.sm,
    fontWeight: "800",
  },
});
