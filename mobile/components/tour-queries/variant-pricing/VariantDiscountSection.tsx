import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AdminFormSection, AdminPickerSheet } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { AppliedVariantDiscountPayload } from "@/lib/tour-query-pricing";
import {
  formatDiscountLabel,
  hasAppliedVariantDiscount,
  type VariantDiscountType,
} from "@/lib/variant-pricing-discount";
import { formatINR } from "@/lib/variant-pricing-utils";

type Props = {
  discountType: VariantDiscountType;
  onDiscountTypeChange: (type: VariantDiscountType) => void;
  discountValue: string;
  onDiscountValueChange: (value: string) => void;
  discountReason: string;
  onDiscountReasonChange: (value: string) => void;
  appliedDiscount: AppliedVariantDiscountPayload | null | undefined;
  onApplyDiscount: () => void;
  onClearDiscount: () => void;
};

const DISCOUNT_TYPE_OPTIONS = [
  { id: "percent", label: "Percentage (%)" },
  { id: "fixed", label: "Fixed amount" },
];

export function VariantDiscountSection({
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  discountReason,
  onDiscountReasonChange,
  appliedDiscount,
  onApplyDiscount,
  onClearDiscount,
}: Props) {
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const typeLabel =
    DISCOUNT_TYPE_OPTIONS.find((option) => option.id === discountType)?.label ??
    "Percentage (%)";

  return (
    <AdminFormSection title="Apply Discount" testID="variant-pricing-discount-section">
      <Text style={styles.hint}>
        Percentage discounts update each row description with discount and GST. Fixed discounts
        apply to the final total only.
      </Text>

      <Pressable
        testID="variant-pricing-discount-type"
        accessibilityRole="button"
        accessibilityLabel="Discount type"
        style={styles.pickerButton}
        onPress={() => setTypePickerOpen(true)}
      >
        <Text style={styles.pickerLabel}>Discount type</Text>
        <Text style={styles.pickerValue}>{typeLabel}</Text>
      </Pressable>

      <TextInput
        testID="variant-pricing-discount-value"
        accessibilityLabel={discountType === "percent" ? "Discount percent" : "Discount amount"}
        value={discountValue}
        onChangeText={onDiscountValueChange}
        placeholder={discountType === "percent" ? "Discount %" : "Discount amount"}
        placeholderTextColor={Colors.textTertiary}
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        testID="variant-pricing-discount-reason"
        accessibilityLabel="Discount reason"
        value={discountReason}
        onChangeText={onDiscountReasonChange}
        placeholder="Reason (optional)"
        placeholderTextColor={Colors.textTertiary}
        style={styles.input}
      />

      <View style={styles.actionRow}>
        <Pressable
          testID="variant-pricing-apply-discount"
          accessibilityRole="button"
          accessibilityLabel="Apply discount"
          style={styles.applyButton}
          onPress={onApplyDiscount}
        >
          <Text style={styles.applyButtonText}>Apply discount</Text>
        </Pressable>
        {hasAppliedVariantDiscount(appliedDiscount ?? null) ? (
          <Pressable
            testID="variant-pricing-clear-discount"
            accessibilityRole="button"
            accessibilityLabel="Clear discount"
            style={styles.clearButton}
            onPress={onClearDiscount}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {hasAppliedVariantDiscount(appliedDiscount ?? null) ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>
            Active: {formatDiscountLabel(appliedDiscount ?? null)} — saves{" "}
            {formatINR(appliedDiscount?.amount ?? 0)}
          </Text>
        </View>
      ) : null}

      <AdminPickerSheet
        visible={typePickerOpen}
        title="Discount type"
        options={DISCOUNT_TYPE_OPTIONS}
        selectedId={discountType}
        searchable={false}
        onSelect={(option) => {
          onDiscountTypeChange(option.id as VariantDiscountType);
          setTypePickerOpen(false);
        }}
        onClose={() => setTypePickerOpen(false)}
        testID="variant-pricing-discount-type-sheet"
      />
    </AdminFormSection>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pickerButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  pickerValue: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
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
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  applyButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  applyButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.textInverse,
  },
  clearButton: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  clearButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  activeBadge: {
    borderRadius: BorderRadius.sm,
    backgroundColor: "#dcfce7",
    padding: Spacing.sm,
  },
  activeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.success,
  },
});
