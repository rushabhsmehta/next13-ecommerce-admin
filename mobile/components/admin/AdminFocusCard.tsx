import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export type FocusPriorityTone = "high" | "medium" | "low";

export interface AdminFocusCardProps {
  eyebrow?: string;
  /** Main headline, e.g. "Follow-ups need review" */
  title: string;
  /** Supporting count line, e.g. "8 due now" */
  detail: string;
  /** Primary action label, sentence case — e.g. "Open CRM" */
  actionLabel?: string;
  onPress?: () => void;
  /** Shown below action when multiple attention items exist */
  secondaryLine?: string;
  onSecondaryPress?: () => void;
  priorityTone?: FocusPriorityTone;
  testID?: string;
}

const dotColor: Record<FocusPriorityTone, string> = {
  high: Colors.error,
  medium: Colors.warning,
  low: Colors.textTertiary,
};

export function AdminFocusCard({
  eyebrow = "Today",
  title,
  detail,
  actionLabel,
  onPress,
  secondaryLine,
  onSecondaryPress,
  priorityTone = "medium",
  testID = "admin-focus-card",
}: AdminFocusCardProps) {
  const hasAction = !!actionLabel && !!onPress;

  return (
    <View
      style={styles.wrap}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={`${eyebrow}. ${title}. ${detail}.`}
    >
      <View style={styles.topRow}>
        <Text style={styles.eyebrow} allowFontScaling={false}>
          {eyebrow}
        </Text>
        <View
          style={[styles.dot, { backgroundColor: dotColor[priorityTone] }]}
          accessibilityElementsHidden
        />
      </View>
      <Text style={styles.title} allowFontScaling={false}>
        {title}
      </Text>
      <Text style={styles.detail} allowFontScaling={false}>
        {detail}
      </Text>
      {hasAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint="Opens the suggested workspace."
          onPress={onPress}
          testID={`${testID}-action`}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText} allowFontScaling={false}>
            {actionLabel}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primaryDark} accessibilityElementsHidden />
        </Pressable>
      ) : null}
      {secondaryLine ? (
        onSecondaryPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLine}
            onPress={onSecondaryPress}
            testID={`${testID}-more`}
          >
            <Text style={styles.secondary} allowFontScaling={false}>
              {secondaryLine}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.secondary} allowFontScaling={false}>
            {secondaryLine}
          </Text>
        )
      ) : null}
    </View>
  );
}

export function AdminFocusEmpty({ testID = "admin-focus-empty" }: { testID?: string }) {
  return (
    <View style={styles.emptyWrap} testID={testID} accessibilityRole="text">
      <Text style={styles.emptyText} allowFontScaling={false}>
        Everything urgent is clear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "700",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 22,
  },
  detail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  actionPressed: { opacity: 0.75 },
  actionText: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.primary,
  },
  secondary: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
});
