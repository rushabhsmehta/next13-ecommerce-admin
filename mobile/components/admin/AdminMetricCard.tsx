import { Pressable, StyleSheet, Text, View } from "react-native";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { AdminStatusPill } from "./AdminStatusPill";

export type MetricDotTone = "attention" | "neutral";

export interface AdminMetricCardProps {
  id: string;
  label: string;
  /** Kept for accessibility; omit from UI unless showCategory */
  category: string;
  value: string | number;
  detail?: string;
  requiresAttention?: boolean;
  /** Optional attention marker when pills are omitted */
  dotTone?: MetricDotTone;
  accentValueColor?: string;
  /** Default false — calmer dashboard metrics */
  showCategory?: boolean;
  testID?: string;
  onPress?: () => void;
}

function formatDisplayValue(raw: string | number): string {
  return typeof raw === "string" ? raw : String(raw);
}

export function AdminMetricCard({
  id,
  label,
  category,
  value,
  detail,
  requiresAttention,
  dotTone,
  accentValueColor,
  showCategory = false,
  testID,
  onPress,
}: AdminMetricCardProps) {
  const displayed = formatDisplayValue(value);
  const tid = testID ?? `admin-kpi-card-${id}`;
  const effectiveDot: MetricDotTone =
    dotTone ?? (requiresAttention ? "attention" : "neutral");

  const inner = (
    <>
      <View style={styles.valueRow}>
        {effectiveDot === "attention" ? (
          <View
            style={[styles.dot, { backgroundColor: Colors.primary }]}
            accessibilityLabel="Needs attention"
          />
        ) : (
          <View style={styles.dotPlaceholder} accessibilityElementsHidden />
        )}
        <Text
          style={[styles.value, accentValueColor ? { color: accentValueColor } : null]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          allowFontScaling={false}
        >
          {displayed}
        </Text>
      </View>
      <Text style={styles.label} numberOfLines={2} allowFontScaling={false}>
        {label}
      </Text>
      {showCategory ? (
        <AdminStatusPill variant="muted" label={category} compact testID={`${tid}-category`} />
      ) : null}
      {detail ? (
        <Text style={styles.detail} numberOfLines={1} allowFontScaling={false}>
          {detail}
        </Text>
      ) : null}
    </>
  );

  const a11y = `${label}. Value ${displayed}.`;

  if (onPress) {
    return (
      <Pressable
        testID={tid}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint="Opens related records."
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          requiresAttention ? styles.attentionWrap : null,
          pressed && styles.pressed,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View
      testID={tid}
      accessibilityRole="text"
      accessibilityLabel={a11y}
      style={[styles.card, requiresAttention ? styles.attentionWrap : null]}
    >
      {inner}
    </View>
  );
}

const CARD_MIN_HEIGHT = 86;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: CARD_MIN_HEIGHT,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    gap: 4,
    justifyContent: "flex-start",
  },
  attentionWrap: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  pressed: {
    borderColor: Colors.primary,
    opacity: 0.92,
    backgroundColor: Colors.primarySoft,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  dotPlaceholder: { width: 8 },
  value: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 26,
    flexShrink: 1,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "700",
    flexGrow: 1,
    lineHeight: 16,
  },
  detail: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: "600",
    lineHeight: 14,
  },
});
