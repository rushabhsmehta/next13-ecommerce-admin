import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export interface TripFocusCardProps {
  /** Short headline for lists (explanatory) or primary suggestion */
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "strip" | "card";
  testID?: string;
}

/**
 * Lightweight focus / guidance card. Use `strip` for list context copy.
 */
export function TripFocusCard({
  title,
  detail,
  actionLabel,
  onAction,
  variant = "card",
  testID = "trips-focus-card",
}: TripFocusCardProps) {
  const isStrip = variant === "strip";
  const hasAction = !!actionLabel && !!onAction;
  return (
    <View
      style={[styles.wrap, isStrip ? styles.strip : styles.card]}
      testID={testID}
      accessibilityRole="summary"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
    >
      <Text style={[styles.title, isStrip ? styles.titleStrip : null]} allowFontScaling={false}>
        {title}
      </Text>
      {detail ? (
        <Text style={styles.detail} allowFontScaling={false}>
          {detail}
        </Text>
      ) : null}
      {hasAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint="Runs the suggested next step."
          onPress={onAction}
          testID={`${testID}-action`}
          style={({ pressed }) => [styles.actionPress, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} accessibilityElementsHidden />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  card: { marginBottom: 0 },
  strip: {
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  titleStrip: { fontSize: FontSize.sm },
  detail: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionPress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  pressed: { opacity: 0.76 },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
});
