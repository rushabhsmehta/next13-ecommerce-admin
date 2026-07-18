import type { PerPersonRatesResult } from "@/lib/pricing-calculator";
import type { AppliedVariantDiscount } from "@/lib/variant-pricing-discount";
import type { PricingLineAmounts } from "@/lib/variant-pricing-discount";
import {
  buildComponentPricingDescription,
  computePricingLineAmounts,
  isAirFarePricingLabel,
  isGeneratedPricingLineDescription,
  parsePricingLineContext,
  sumAirFareAmount,
  VARIANT_PRICING_GST_PERCENT,
} from "@/lib/variant-pricing-discount";
import { DEFAULT_PRICING_SECTION } from "@/components/tour-package-query/defaultValues";

export type VariantPricingComponent = {
  name?: string;
  attributeName?: string;
  price?: string | number;
  description?: string | null;
};

export type VariantPricingEntry = {
  components?: VariantPricingComponent[];
  componentsBeforeDiscount?: VariantPricingComponent[];
  totalCost?: number;
  subtotalBeforeDiscount?: number;
  appliedDiscount?: AppliedVariantDiscount;
  perPersonRates?: PerPersonRatesResult;
  remarks?: string;
};

const SUMMARY_ROW_NAMES = new Set(["total cost", "accommodation", "transport"]);

const DEFAULT_LABEL_ORDER = DEFAULT_PRICING_SECTION.map((item) => item.name);

export function matchPricingItemRateKey(
  label: string
): keyof PerPersonRatesResult["rates"] | null {
  const l = (label || "").toLowerCase();
  if (l.includes("couple")) return "perCouple";
  if (l.includes("extra bed") || l.includes("extra mattress")) return "perPersonWithExtraBed";
  if (l.includes("child below 5") && (l.includes("without seat") || l.includes("no seat")))
    return "childBelow5WithoutSeat";
  if (l.includes("child below 5") && l.includes("with seat")) return "childBelow5WithSeat";
  if (l.includes("child") && l.includes("without") && l.includes("mattress"))
    return "childWithoutMattress";
  if (l.includes("child") && l.includes("with") && l.includes("mattress"))
    return "childWithMattress";
  if (l.includes("per person")) return "perPerson";
  return null;
}

export type PricingCalculationParts = PricingLineAmounts & {
  qtyLabel?: string;
  /** Non-taxable Air Fare shown after GST on package totals. */
  airFareAmount?: number;
};

export type PricingDisplayRow = {
  label: string;
  price: number;
  netPrice: number;
  calculationParts?: PricingCalculationParts;
  calculationText?: string;
  description?: string;
};

function buildCalculationParts(
  unitBase: number,
  description: string | undefined | null,
  appliedDiscount?: AppliedVariantDiscount | null,
  options: { excludeGstAndDiscount?: boolean; airFareAmount?: number } = {}
): PricingCalculationParts {
  const { qty, label: qtyLabel } = parsePricingLineContext(description);
  const discountPercent = options.excludeGstAndDiscount
    ? 0
    : resolveRowDiscountPercent(appliedDiscount);
  const amounts = computePricingLineAmounts({
    unitBase,
    discountPercent,
    qty,
    gstPercent: options.excludeGstAndDiscount ? 0 : undefined,
  });
  const airFareAmount = Math.max(0, Math.round(options.airFareAmount ?? 0));
  const netLineTotal = amounts.netLineTotal + airFareAmount;
  return {
    ...amounts,
    netLineTotal,
    netUnitPrice: qty > 1 ? Math.round(netLineTotal / qty) : netLineTotal,
    qtyLabel,
    ...(airFareAmount > 0 ? { airFareAmount } : {}),
  };
}

function withAirFareOnParts(
  parts: PricingCalculationParts,
  airFareAmount: number
): PricingCalculationParts {
  const safeAirFare = Math.max(0, Math.round(airFareAmount));
  if (safeAirFare <= 0) return parts;
  const netLineTotal = parts.afterDiscount + parts.gstAmount + safeAirFare;
  return {
    ...parts,
    airFareAmount: safeAirFare,
    netLineTotal,
    netUnitPrice: parts.qty > 1 ? Math.round(netLineTotal / parts.qty) : netLineTotal,
  };
}

/** Per-unit breakdown for rate rows (Per Person, Per Couple, etc.) in price comparison cells. */
export function toUnitDisplayParts(parts: PricingCalculationParts): PricingCalculationParts {
  if (parts.qty <= 1) return parts;
  const unitParts = computePricingLineAmounts({
    unitBase: parts.unitBase,
    discountPercent: parts.discountPercent,
    qty: 1,
    gstPercent: parts.discountPercent === 0 && parts.gstAmount === 0 ? 0 : undefined,
  });
  return {
    ...unitParts,
    qtyLabel: parts.qtyLabel,
  };
}

/** Package-level breakdown for the Total Price row in price comparison. */
export function buildPackageTotalCalculationParts(
  vpd: VariantPricingEntry | undefined | null
): PricingCalculationParts | null {
  if (!vpd) return null;

  const components = vpd.componentsBeforeDiscount?.length
    ? vpd.componentsBeforeDiscount
    : vpd.components;
  const airFareAmount = sumAirFareAmount(components);

  // Taxable package base (excludes Air Fare). Prefer stored subtotalBeforeDiscount.
  let taxableBase = Math.round(
    parseFloat(String(vpd.subtotalBeforeDiscount ?? 0))
  );
  if (!Number.isFinite(taxableBase) || taxableBase <= 0) {
    const storedTotal = Math.round(parseFloat(String(vpd.totalCost ?? 0)));
    if (Number.isFinite(storedTotal) && storedTotal > 0) {
      taxableBase = Math.max(0, storedTotal - airFareAmount);
    }
  }
  if (!Number.isFinite(taxableBase) || taxableBase < 0) return null;
  if (taxableBase <= 0 && airFareAmount <= 0) return null;

  const applied = vpd.appliedDiscount;
  if (applied?.type === "percent" && applied.inputValue > 0) {
    return withAirFareOnParts(
      buildCalculationParts(taxableBase, null, applied),
      airFareAmount
    );
  }

  if (applied?.type === "fixed" && applied.amount > 0) {
    const discountAmount = Math.min(taxableBase, Math.round(applied.amount));
    const afterDiscount = Math.max(0, taxableBase - discountAmount);
    const gstAmount = Math.round(afterDiscount * (VARIANT_PRICING_GST_PERCENT / 100));
    const netLineTotal = afterDiscount + gstAmount + airFareAmount;
    return {
      unitBase: taxableBase,
      qty: 1,
      lineBase: taxableBase,
      discountPercent: 0,
      discountAmount,
      afterDiscount,
      gstAmount,
      netLineTotal,
      netUnitPrice: netLineTotal,
      ...(airFareAmount > 0 ? { airFareAmount } : {}),
    };
  }

  if (taxableBase <= 0 && airFareAmount > 0) {
    return {
      unitBase: 0,
      qty: 1,
      lineBase: 0,
      discountPercent: 0,
      discountAmount: 0,
      afterDiscount: 0,
      gstAmount: 0,
      netLineTotal: airFareAmount,
      netUnitPrice: airFareAmount,
      airFareAmount,
    };
  }

  return withAirFareOnParts(buildCalculationParts(taxableBase, null, null), airFareAmount);
}

function parsePrice(value: string | number | undefined | null): number {
  const n = parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function resolveRowDiscountPercent(appliedDiscount?: AppliedVariantDiscount | null): number {
  if (appliedDiscount?.type === "percent" && appliedDiscount.inputValue > 0) {
    return appliedDiscount.inputValue;
  }
  return 0;
}

export function resolvePricingDisplayRow(
  comp: VariantPricingComponent,
  appliedDiscount?: AppliedVariantDiscount | null,
  beforeDiscountComp?: VariantPricingComponent | null
): PricingDisplayRow | null {
  const label = (comp.name || comp.attributeName || "").trim();
  if (!label || SUMMARY_ROW_NAMES.has(label.toLowerCase())) return null;

  const unitBase = parsePrice(beforeDiscountComp?.price ?? comp.price);
  if (unitBase <= 0) return null;

  const isAirFare = isAirFarePricingLabel(label);
  const contextDescription = beforeDiscountComp?.description ?? comp.description;
  const storedDescription = comp.description || beforeDiscountComp?.description || undefined;
  const calculationParts = buildCalculationParts(
    unitBase,
    contextDescription,
    isAirFare ? null : appliedDiscount,
    { excludeGstAndDiscount: isAirFare }
  );

  if (
    !isAirFare &&
    storedDescription &&
    isGeneratedPricingLineDescription(storedDescription)
  ) {
    return {
      label,
      price: unitBase,
      netPrice: calculationParts.netUnitPrice,
      calculationParts,
      calculationText: storedDescription,
      description: storedDescription,
    };
  }

  const built = buildComponentPricingDescription(
    unitBase,
    contextDescription,
    isAirFare ? null : appliedDiscount,
    { label }
  );
  return {
    label,
    price: unitBase,
    netPrice: built.netUnitPrice,
    calculationParts,
    calculationText: built.description,
    description: built.description,
  };
}

function findBeforeDiscountComponent(
  componentsBeforeDiscount: VariantPricingComponent[] | undefined,
  label: string
): VariantPricingComponent | undefined {
  if (!Array.isArray(componentsBeforeDiscount)) return undefined;
  return componentsBeforeDiscount.find(
    (comp) => (comp.name || comp.attributeName || "").trim() === label
  );
}

function rowsFromPerPersonRates(perPersonRates: PerPersonRatesResult): PricingDisplayRow[] {
  const rows: PricingDisplayRow[] = [];
  for (const item of DEFAULT_PRICING_SECTION) {
    const key = matchPricingItemRateKey(item.name);
    if (!key) continue;
    const rate = perPersonRates.rates[key];
    if (!rate || rate.price === null || rate.price <= 0) continue;
    const unitBase = rate.price;
    const calculationParts = buildCalculationParts(unitBase, rate.description || "", null);
    const built = buildComponentPricingDescription(unitBase, rate.description || "", null);
    rows.push({
      label: item.name,
      price: unitBase,
      netPrice: calculationParts.netUnitPrice,
      calculationParts,
      calculationText: built.description,
      description: rate.description || built.description,
    });
  }
  return rows;
}

function rowsFromComponents(
  components: VariantPricingComponent[],
  appliedDiscount?: AppliedVariantDiscount | null,
  componentsBeforeDiscount?: VariantPricingComponent[]
): PricingDisplayRow[] {
  const rows: PricingDisplayRow[] = [];
  for (const comp of components) {
    const label = (comp.name || comp.attributeName || "").trim();
    const beforeDiscountComp = findBeforeDiscountComponent(componentsBeforeDiscount, label);
    const row = resolvePricingDisplayRow(comp, appliedDiscount, beforeDiscountComp);
    if (row) rows.push(row);
  }
  return rows;
}

/** Per-variant pricing rows for Price Comparison (components first, then perPersonRates fallback). */
export function getVariantPricingDisplayRows(
  vpd: VariantPricingEntry | undefined | null,
  snapshotComponents: VariantPricingComponent[] = []
): PricingDisplayRow[] {
  const appliedDiscount = vpd?.appliedDiscount;
  const fromComponents = rowsFromComponents(
    vpd?.components || [],
    appliedDiscount,
    vpd?.componentsBeforeDiscount
  );
  if (fromComponents.length > 0) return fromComponents;

  if (vpd?.perPersonRates?.rates) {
    const fromRates = rowsFromPerPersonRates(vpd.perPersonRates);
    if (fromRates.length > 0) return fromRates;
  }

  return rowsFromComponents(snapshotComponents, appliedDiscount);
}

/** Union of row labels across variants, with default pricing order first. */
export function mergeVariantPricingRowLabels(
  variants: { label: string }[][]
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const label of DEFAULT_LABEL_ORDER) {
    if (variants.some((rows) => rows.some((r) => r.label === label))) {
      ordered.push(label);
      seen.add(label);
    }
  }

  for (const rows of variants) {
    for (const row of rows) {
      if (!seen.has(row.label)) {
        ordered.push(row.label);
        seen.add(row.label);
      }
    }
  }

  return ordered;
}

export function findPricingRowPrice(
  rows: PricingDisplayRow[],
  label: string
): PricingDisplayRow | undefined {
  return rows.find((row) => row.label === label);
}

export type PricingItemInput = {
  name: string;
  price: string;
  description: string;
  derivationFormula?: string;
};

/** Apply derived per-guest rates onto the pricing breakdown item list. */
export function applyPerPersonRatesToPricingItems(
  items: PricingItemInput[],
  perPersonRates: PerPersonRatesResult,
  options: {
    numChild5to12?: number;
    numChild0to5?: number;
  } = {}
): PricingItemInput[] {
  const { numChild5to12 = 0, numChild0to5 = 0 } = options;
  const apiMainPax = perPersonRates.mainPax ?? 1;
  const apiExtraBedPax = perPersonRates.extraBedPax ?? 0;
  const apiCnbPax = perPersonRates.cnbPax ?? 0;

  const getQtyForKey = (key: string): { qty: number; label: string } => {
    if (key === "perPerson") return { qty: apiMainPax, label: "Adults" };
    if (key === "perCouple")
      return { qty: Math.ceil(apiMainPax / 2) || 0, label: "Couples" };
    if (key === "perPersonWithExtraBed")
      return { qty: apiExtraBedPax, label: "Extra Bed" };
    if (key === "childWithMattress" || key === "childWithoutMattress")
      return { qty: numChild5to12, label: "Children" };
    if (key === "childBelow5WithSeat") return { qty: apiCnbPax, label: "CNB" };
    if (key === "childBelow5WithoutSeat")
      return { qty: numChild0to5, label: "Children" };
    return { qty: apiMainPax, label: "Pax" };
  };

  return items.map((item) => {
    const key = matchPricingItemRateKey(item.name || "");
    if (!key) return item;
    const rate = perPersonRates.rates[key];
    if (!rate || rate.price === null) return item;
    const price = rate.price ?? 0;
    const { qty, label } = getQtyForKey(key);
    const total = price * qty;
    const autoDescription =
      qty > 0 && price > 0
        ? `${qty} ${label} × Rs.${price.toLocaleString("en-IN")} = Rs.${total.toLocaleString("en-IN")}`
        : "";
    return {
      ...item,
      price: rate.price !== null && rate.price !== undefined ? rate.price.toString() : "",
      description: autoDescription,
      derivationFormula: rate.description || "",
    };
  });
}

export { VARIANT_PRICING_GST_PERCENT };
