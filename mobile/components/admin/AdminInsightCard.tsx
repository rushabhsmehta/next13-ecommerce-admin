import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";

export type AdminInsightSeverity = "high" | "medium";

export type AdminInsightVariant = "default" | "focus" | "compact";

const stripColor: Record<AdminInsightSeverity, string> = {
  high: Colors.error,
  medium: Colors.warning,
};

export interface AdminInsightCardProps {
  statId: string;
  title: string;
  valueDisplay: string;
  severity: AdminInsightSeverity;
  icon: keyof typeof Ionicons.glyphMap;
  /** Sentence case, e.g. "Open CRM" */
  actionLine: string;
  onPress?: () => void;
  disabledHint?: boolean;
  testID?: string;
  variant?: AdminInsightVariant;
}

export function AdminInsightCard({
  statId,
  title,
  valueDisplay,
  severity,
  icon,
  actionLine,
  onPress,
  disabledHint,
  testID,
  variant = "default",
}: AdminInsightCardProps) {
  const tid = testID ?? `admin-attention-card-${statId}`;
  const muted = !!(disabledHint && !onPress);
  const useStrip = variant === "default";
  const useRing = variant === "default";

  const body = (
    <>
      {useStrip ? (
        <View style={[styles.strip, { backgroundColor: stripColor[severity] }]} accessibilityElementsHidden />
      ) : null}
      {!useStrip ? (
        <View style={[styles.focusDot, { backgroundColor: stripColor[severity] }]} accessibilityElementsHidden />
      ) : null}
      <View style={useRing ? styles.iconRing : styles.iconMuted}>
        <Ionicons name={icon} size={variant === "compact" ? 18 : 20} color={Colors.primaryDark} accessibilityElementsHidden />
      </View>
      <View style={styles.content}>
        <Text style={[styles.titleLabel, variant !== "default" && styles.titleQuiet]} allowFontScaling={false} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.metric, variant !== "default" && styles.metricQuiet]} allowFontScaling={false} numberOfLines={2}>
          {valueDisplay}
        </Text>
        <Text style={[styles.actionLine, muted && styles.actionMuted]} allowFontScaling={false} numberOfLines={2}>
          {disabledHint ? "Check detailed reports on web" : actionLine}
        </Text>
      </View>
      {onPress && !muted ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} accessibilityElementsHidden />
      ) : null}
    </>
  );

  if (onPress && !muted) {
    return (
      <Pressable
        testID={tid}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${valueDisplay}.`}
        accessibilityHint="Opens the related workspace."
        onPress={onPress}
        style={({ pressed }) => [styles.row, variant !== "default" && styles.rowQuiet, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      testID={tid}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${valueDisplay}.`}
      accessibilityHint={muted ? "No shortcut on mobile yet." : undefined}
      style={[styles.rowMuted, variant !== "default" && styles.rowQuiet]}
    >
      {body}
    </View>
  );
}

const ROW_MIN_HEIGHT = 84;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: ROW_MIN_HEIGHT,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  rowQuiet: {
    minHeight: 72,
    backgroundColor: Colors.background,
  },
  rowMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: ROW_MIN_HEIGHT - 8,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceAlt,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  strip: {
    width: 5,
    alignSelf: "stretch",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  focusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.sm,
  },
  iconMuted: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.sm,
  },
  content: {
    flex: 1,
    gap: 2,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
  },
  titleLabel: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  titleQuiet: {
    fontSize: FontSize.sm,
  },
  metric: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.primaryDark,
    marginTop: 2,
  },
  metricQuiet: {
    fontSize: FontSize.md,
  },
  actionLine: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
    marginTop: 6,
    textTransform: "none",
    letterSpacing: 0,
  },
  actionMuted: {
    color: Colors.textTertiary,
  },
});
