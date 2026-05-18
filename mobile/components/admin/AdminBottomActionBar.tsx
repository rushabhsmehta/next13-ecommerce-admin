import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface AdminBottomActionBarProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryTestID?: string;
  primaryDisabled?: boolean;
  primaryHint?: string;
  primaryIcon?: keyof typeof Ionicons.glyphMap;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryTestID?: string;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  /** Explains why primary is disabled (offline, permissions) */
  disabledReason?: string;
  children?: ReactNode;
}

export function AdminBottomActionBar({
  primaryLabel,
  onPrimaryPress,
  primaryTestID = "admin-bottom-primary",
  primaryDisabled,
  primaryHint,
  primaryIcon,
  secondaryLabel,
  onSecondaryPress,
  secondaryTestID = "admin-bottom-secondary",
  secondaryIcon,
  disabledReason,
  children,
}: AdminBottomActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
      testID="admin-bottom-action-bar"
    >
      {disabledReason && primaryDisabled ? (
        <View style={styles.disabledReasonWrap} accessibilityRole="text">
          <View style={styles.disabledReasonIcon} accessibilityElementsHidden>
            <Text style={styles.disabledReasonIconText} allowFontScaling={false}>
              !
            </Text>
          </View>
          <Text style={styles.disabledReason} allowFontScaling={false}>
            {disabledReason}
          </Text>
        </View>
      ) : null}
      {children}
      <View style={styles.row}>
        {secondaryLabel && onSecondaryPress ? (
          <Pressable
            testID={secondaryTestID}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSecondaryPress}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            {secondaryIcon ? (
              <Ionicons
                name={secondaryIcon}
                size={16}
                color={Colors.text}
                accessibilityElementsHidden
              />
            ) : null}
            <Text style={styles.secondaryText} allowFontScaling={false}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          testID={primaryTestID}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityHint={primaryHint}
          accessibilityState={{ disabled: !!primaryDisabled }}
          disabled={primaryDisabled}
          onPress={onPrimaryPress}
          style={({ pressed }) => [
            styles.primaryBtn,
            secondaryLabel ? styles.primaryBtnFlex : styles.primaryBtnFull,
            primaryDisabled && styles.primaryDisabled,
            pressed && !primaryDisabled && styles.pressed,
          ]}
        >
          {primaryIcon ? (
            <Ionicons
              name={primaryIcon}
              size={16}
              color={Colors.textInverse}
              accessibilityElementsHidden
            />
          ) : null}
          <Text style={styles.primaryText} allowFontScaling={false}>
            {primaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  disabledReasonWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
  },
  disabledReasonIcon: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  disabledReasonIconText: {
    color: Colors.textInverse,
    fontSize: FontSize.xs,
    fontWeight: "900",
  },
  disabledReason: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "700",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "stretch",
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnFull: { flex: 1 },
  primaryBtnFlex: { flex: 1.4 },
  primaryDisabled: { opacity: 0.45 },
  primaryText: {
    color: Colors.textInverse,
    fontSize: FontSize.md,
    fontWeight: "800",
    textAlign: "center",
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  pressed: { opacity: 0.88 },
});
