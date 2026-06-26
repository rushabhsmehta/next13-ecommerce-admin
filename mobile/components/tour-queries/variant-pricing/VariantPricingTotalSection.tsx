import { StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFormSection } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { formatINR } from "@/lib/variant-pricing-utils";

type Props = {
  totalCost: string;
  onTotalCostChange: (value: string) => void;
  remarks: string;
  onRemarksChange: (value: string) => void;
  roomCount?: number;
  rowsTotal?: number;
};

export function VariantPricingTotalSection({
  totalCost,
  onTotalCostChange,
  remarks,
  onRemarksChange,
  roomCount,
  rowsTotal,
}: Props) {
  return (
    <AdminFormSection title="Total Package Price" testID="variant-pricing-total-section">
      <View style={styles.finalCard}>
        <Text style={styles.finalLabel}>Final amount</Text>
        <Text style={styles.finalValue}>{formatINR(totalCost)}</Text>
        <Text style={styles.finalHint}>Including GST on applicable line items</Text>
      </View>

      {roomCount != null && roomCount > 0 ? (
        <View style={styles.roomBadge}>
          <Text style={styles.roomBadgeLabel}>Room configuration</Text>
          <Text style={styles.roomBadgeValue}>
            {roomCount} room{roomCount === 1 ? "" : "s"}
          </Text>
        </View>
      ) : null}

      {rowsTotal != null ? (
        <Text style={styles.rowsTotalHint}>Breakdown rows total: {formatINR(rowsTotal)}</Text>
      ) : null}

      <TextInput
        testID="variant-pricing-total"
        accessibilityLabel="Total price"
        value={totalCost}
        onChangeText={onTotalCostChange}
        placeholder="Total price"
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        testID="variant-pricing-remarks"
        accessibilityLabel="Pricing remarks"
        value={remarks}
        onChangeText={onRemarksChange}
        placeholder="Additional remarks for this variant pricing"
        placeholderTextColor={Colors.textTertiary}
        multiline
        style={[styles.input, styles.multiline]}
      />
    </AdminFormSection>
  );
}

const styles = StyleSheet.create({
  finalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    gap: 4,
  },
  finalLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  finalValue: {
    fontSize: FontSize.xl,
    fontWeight: "900",
    color: Colors.text,
  },
  finalHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
  },
  roomBadgeLabel: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  roomBadgeValue: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.text,
  },
  rowsTotalHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
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
  multiline: {
    minHeight: 78,
    textAlignVertical: "top",
    lineHeight: 20,
  },
});
