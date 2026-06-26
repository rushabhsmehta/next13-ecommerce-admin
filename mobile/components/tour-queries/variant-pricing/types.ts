import type { VariantPricingComponent } from "@/lib/tour-query-pricing";
import type { VariantCalculationMethod } from "@/lib/tour-query-pricing";

export type LocalPricingRow = VariantPricingComponent & { localId: string };

export function makePricingRow(
  seed?: Partial<VariantPricingComponent>,
  index = 0
): LocalPricingRow {
  return {
    localId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    name: seed?.name ? String(seed.name) : "",
    price: seed?.price ? String(seed.price) : "",
    description: seed?.description ? String(seed.description) : "",
  };
}

export const VARIANT_PRICING_METHOD_OPTIONS: Array<{
  id: VariantCalculationMethod;
  label: string;
}> = [
  { id: "manual", label: "Manual" },
  { id: "autoHotelTransport", label: "Hotel + Transport" },
  { id: "useTourPackagePricing", label: "Package pricing" },
];

export const MARKUP_TIER_PRESETS = [0, 10, 20, 30];

export function methodLabel(method: string | null | undefined): string {
  if (method === "manual") return "Manual pricing";
  if (method === "autoHotelTransport") return "Hotel + transport";
  if (method === "autoTourPackage" || method === "useTourPackagePricing") {
    return "Package pricing";
  }
  return "No method";
}

export function normalizeCalculationMethod(
  method: string | null | undefined
): VariantCalculationMethod {
  if (method === "autoHotelTransport") return "autoHotelTransport";
  if (method === "useTourPackagePricing" || method === "autoTourPackage") {
    return "useTourPackagePricing";
  }
  return "manual";
}
