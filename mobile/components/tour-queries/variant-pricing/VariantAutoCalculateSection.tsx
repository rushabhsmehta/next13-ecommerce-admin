import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type {
  VariantPricingCalculationResponse,
  VariantPricingDayBreakdown,
  VariantPricingRoomCostDetail,
  VariantPricingTransportDetail,
} from "@/lib/tour-query-pricing";
import { formatINR } from "@/lib/variant-pricing-utils";
import { MARKUP_TIER_PRESETS } from "./types";

type Props = {
  markup: string;
  onMarkupChange: (value: string) => void;
  calculating: boolean;
  calculation: VariantPricingCalculationResponse | null;
  onCalculate: () => void;
};

function dayNumberOf(day: VariantPricingDayBreakdown, index: number): number {
  return Number(day.day ?? day.dayNumber ?? index + 1);
}

function dayTotalOf(day: VariantPricingDayBreakdown): number {
  return Number(day.totalCost ?? day.dayTotal ?? 0);
}

function roomPriceLine(room: VariantPricingRoomCostDetail): string {
  const qty = Number(room.quantity ?? 1);
  const pricePerNight = Number(room.pricePerNight ?? 0);
  const total = Number(room.totalCost ?? 0);
  if (total > 0 && pricePerNight > 0 && qty > 1) {
    return `${formatINR(pricePerNight)} × ${qty} = ${formatINR(total)}`;
  }
  return total > 0 ? formatINR(total) : formatINR(0);
}

function transportsForDay(
  transports: VariantPricingTransportDetail[] | undefined,
  dayNumber: number
): VariantPricingTransportDetail[] {
  if (!Array.isArray(transports)) return [];
  return transports.filter((item) => Number(item.day) === dayNumber);
}

export function VariantAutoCalculateSection({
  markup,
  onMarkupChange,
  calculating,
  calculation,
  onCalculate,
}: Props) {
  const markupPct = Number(calculation?.appliedMarkup?.percentage ?? 0);
  const markupAmount = Number(calculation?.appliedMarkup?.amount ?? 0);

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

          <View
            style={styles.formulaCard}
            testID="variant-pricing-calc-formula"
            accessibilityLabel={`Calculation: stay ${formatINR(calculation.breakdown.accommodation)} plus transport ${formatINR(calculation.breakdown.transport)} equals base ${formatINR(calculation.basePrice)}. Markup ${markupPct} percent adds ${formatINR(markupAmount)}. Total ${formatINR(calculation.totalCost)}.`}
          >
            <Text style={styles.formulaTitle}>How this total was calculated</Text>
            <Text style={styles.formulaLine}>
              Stay {formatINR(calculation.breakdown.accommodation)} + Transport{" "}
              {formatINR(calculation.breakdown.transport)} = Base{" "}
              {formatINR(calculation.basePrice)}
            </Text>
            <Text style={styles.formulaLine}>
              Base {formatINR(calculation.basePrice)}
              {markupPct > 0
                ? ` + Markup ${markupPct}% (${formatINR(markupAmount)})`
                : " + Markup 0%"}{" "}
              = Total {formatINR(calculation.totalCost)}
            </Text>
          </View>

          {Array.isArray(calculation.itineraryBreakdown) &&
          calculation.itineraryBreakdown.length > 0 ? (
            <View style={styles.breakdownCard} testID="variant-pricing-day-breakdown">
              <Text style={styles.breakdownTitle}>Day breakdown</Text>
              {calculation.itineraryBreakdown.map((day, index) => {
                const dayNumber = dayNumberOf(day, index);
                const stay = Number(day.accommodationCost ?? 0);
                const transportFromDay = Number(day.transportCost ?? 0);
                const dayTransports = transportsForDay(
                  calculation.transportDetails,
                  dayNumber
                );
                const transportFromDetails = dayTransports.reduce(
                  (sum, item) => sum + Number(item.totalCost ?? 0),
                  0
                );
                const transport =
                  transportFromDay > 0 ? transportFromDay : transportFromDetails;
                const rooms = Array.isArray(day.roomBreakdown) ? day.roomBreakdown : [];

                return (
                  <View
                    key={`day-${dayNumber}-${index}`}
                    style={styles.dayBlock}
                    testID={`variant-pricing-day-${dayNumber}`}
                  >
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownDay}>Day {dayNumber}</Text>
                      <Text style={styles.breakdownAmount}>{formatINR(dayTotalOf(day))}</Text>
                    </View>
                    {day.hotelName ? (
                      <Text style={styles.hotelName}>{day.hotelName}</Text>
                    ) : null}
                    <View style={styles.daySplitRow}>
                      <Text style={styles.daySplitText}>Stay {formatINR(stay)}</Text>
                      <Text style={styles.daySplitText}>Transport {formatINR(transport)}</Text>
                    </View>
                    {rooms.map((room, roomIndex) => {
                      const label = [
                        room.roomTypeName || "Room",
                        room.occupancyTypeName
                          ? `(${room.occupancyTypeName})`
                          : null,
                        room.mealPlanName ? `· ${room.mealPlanName}` : null,
                        Number(room.quantity ?? 1) > 1
                          ? `× ${Number(room.quantity)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <View key={`room-${roomIndex}`} style={styles.detailBlock}>
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{label}</Text>
                            <Text style={styles.detailAmount}>{roomPriceLine(room)}</Text>
                          </View>
                          {(room.extraBedCosts ?? []).map((extra, extraIndex) => (
                            <View
                              key={`extra-${extraIndex}`}
                              style={styles.extraRow}
                            >
                              <Text style={styles.extraLabel}>
                                + Extra bed
                                {extra.occupancyTypeName
                                  ? `: ${extra.occupancyTypeName}`
                                  : ""}
                              </Text>
                              <Text style={styles.extraAmount}>
                                {formatINR(Number(extra.totalCost ?? 0))}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                    {dayTransports.map((item, transportIndex) => (
                      <View
                        key={`transport-${transportIndex}`}
                        style={styles.detailRow}
                      >
                        <Text style={styles.detailLabel}>
                          {item.vehicleType || "Vehicle"}
                          {Number(item.quantity ?? 1) > 1
                            ? ` × ${Number(item.quantity)}`
                            : ""}
                          {item.pricingType ? ` · ${item.pricingType}` : ""}
                        </Text>
                        <Text style={styles.detailAmount}>
                          {formatINR(Number(item.totalCost ?? 0))}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
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
  formulaCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    gap: 4,
  },
  formulaTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  formulaLine: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 20,
  },
  breakdownCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  dayBlock: {
    gap: 4,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  breakdownDay: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  breakdownAmount: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  hotelName: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  daySplitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  daySplitText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
  },
  detailBlock: {
    gap: 2,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.borderSubtle,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  detailAmount: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.text,
  },
  extraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  extraLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.warning,
  },
  extraAmount: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.warning,
  },
  pressed: { opacity: 0.88 },
});
