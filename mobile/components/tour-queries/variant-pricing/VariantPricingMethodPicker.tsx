import { AdminFormSection } from "@/components/admin";
import { AdminSegmentedControl } from "@/components/admin/AdminSegmentedControl";
import type { VariantCalculationMethod } from "@/lib/tour-query-pricing";
import { VARIANT_PRICING_METHOD_OPTIONS } from "./types";

type Props = {
  value: VariantCalculationMethod;
  onChange: (value: VariantCalculationMethod) => void;
};

export function VariantPricingMethodPicker({ value, onChange }: Props) {
  return (
    <AdminFormSection title="Calculation Method" testID="variant-pricing-method-section">
      <AdminSegmentedControl
        options={VARIANT_PRICING_METHOD_OPTIONS}
        value={value}
        onChange={onChange}
        testIDPrefix="variant-pricing-method"
      />
    </AdminFormSection>
  );
}
