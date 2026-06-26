import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { VariantPricingCalculationResponse } from "@/lib/tour-query-pricing";
import { formatINR } from "@/lib/variant-pricing-utils";
import { MARKUP_TIER_PRESETS } from "./types";

type Props = {
  markup: string;
  onMarkupChange: (value: string) => void;
  calculating: boolean;
  calculation: VariantPricingCalculationResponse | null;
  onCalculate: () => void;
};

export function VariantAutoCalculateSection({
  markup,
  onMarkupChange,
  calculating,
  calculation,
  onCalculate,
}: Props) {
  return (
    <AdminFormSection title="Auto Calculate" testID="variant-pricing-auto-section">
      <Text style={styles.hint}>
        Uses saved variant room allocation and transport. Set markup then calculate.
      </Text>
      <View style={styles.tierRow}>
        {MARKUP_TIER_PRESETS.map((tier) => {
          const active = String(tier) === markup.trim();
          return (
            <Pressable
              key={tier}
              testID={`variant-pricing-markup-tier-${tier}`}
              accessibilityRole="button"
              accessibilityLabel={`Markup ${tier} percent`}
              onPress={() => onMarkupChange(String(tier))}
              style={[styles.tierChip, active ? styles.tierChipActive : null]}
            >
              <Text style={[styles.tierText, active ? styles.tierTextActive : null]}>
                {tier}%
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calculateRow}>
        <TextInput
          testID="variant-pricing-markup"
          accessibilityLabel="Markup percentage"
          value={markup}
          onChangeText={onMarkupChange}
          placeholder="Markup %"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
          style={[styles.input, styles.markupInput]}
        />
        <Pressable
          testID="variant-pricing-calculate"
          accessibilityRole="button"
          accessibilityLabel="Calculate from variant rooms and transport"
          disabled={calculating}
          style={({ pressed }) => [
            styles.calculateButton,
            calculating ? styles.calculateButtonDisabled : null,
            pressed && !calculating ? styles.pressed : null,
          ]}
          onPress={onCalculate}
        >
          {calculating ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <Ionicons name="calculator-outline" size={16} color={Colors.textInverse} />
          )}
          <Text style={styles.calculateButtonText}>
            {calculating ? "Calculating" : "Calculate"}
          </Text>
        </Pressable>
      </View>
      {calculation ? (
        <>
          <View style={styles.calcResult}>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Base</Text>
              <Text style={styles.calcMetricValue}>{formatINR(calculation.basePrice)}</Text>
            </View>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Stay</Text>
              <Text style={styles.calcMetricValue}>
                {formatINR(calculation.breakdown.accommodation)}
              </Text>
            </View>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Transport</Text>
              <Text style={styles.calcMetricValue}>
                {formatINR(calculation.breakdown.transport)}
              </Text>
            </View>
            <View style={styles.calcMetric}>
              <Text style={styles.calcMetricLabel}>Total</Text>
              <Text style={styles.calcMetricValue}>{formatINR(calculation.totalCost)}</Text>
            </View>
          </View>
          {Array.isArray(calculation.itineraryBreakdown) &&
          calculation.itineraryBreakdown.length > 0 ? (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Day breakdown</Text>
              {(calculation.itineraryBreakdown as Array<Record<string, unknown>>).map(
                (day, index) => (
                  <View key={`day-${index}`} style={styles.breakdownRow}>
                    <Text style={styles.breakdownDay}>
                      Day {String(day.dayNumber ?? index + 1)}
                    </Text>
                    <Text style={styles.breakdownAmount}>
                      {formatINR(Number(day.totalCost ?? day.dayTotal ?? 0))}
                    </Text>
                  </View>
                )
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </AdminFormSection>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tierRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  tierChip: {
    minHeight: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tierChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  tierText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  tierTextActive: {
    color: Colors.primary,
  },
  calculateRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.sm,
  },
  markupInput: { flex: 1 },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
  },
  calculateButton: {
    minHeight: 46,
    minWidth: 132,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  calculateButtonDisabled: { opacity: 0.55 },
  calculateButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.textInverse,
  },
  calcResult: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  calcMetric: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 0,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    gap: 2,
  },
  calcMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  calcMetricValue: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.text,
  },
  breakdownCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  breakdownDay: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  breakdownAmount: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  pressed: { opacity: 0.88 },
});
