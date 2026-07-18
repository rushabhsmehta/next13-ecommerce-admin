export type VariantDiscountType = "percent" | "fixed";

export type AppliedVariantDiscount = {
  type: VariantDiscountType;
  inputValue: number;
  amount: number;
  reason?: string;
};

export type VariantDiscountInput = {
  type: VariantDiscountType;
  inputValue: number;
  reason?: string;
};

export type VariantDiscountResult = {
  amount: number;
  totalCost: number;
  appliedDiscount: AppliedVariantDiscount | null;
  subtotalBeforeDiscount: number;
};

export const VARIANT_PRICING_GST_PERCENT = 5;

export type PricingLineAmounts = {
  unitBase: number;
  qty: number;
  lineBase: number;
  discountPercent: number;
  discountAmount: number;
  afterDiscount: number;
  gstAmount: number;
  netLineTotal: number;
  netUnitPrice: number;
  /** Non-taxable Air Fare added after discount + GST (package totals). */
  airFareAmount?: number;
};

export type NamedPricingAmount = {
  name?: string | null;
  attributeName?: string | null;
  price?: string | number | null;
};

function parseNonNegativeNumber(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function roundInr(value: number): number {
  return Math.round(value);
}

export function formatInrAmount(value: number): string {
  return `Rs. ${roundInr(value).toLocaleString("en-IN")}`;
}

/** Exact match for the Air Fare pricing row / attribute (case-insensitive). */
export function isAirFarePricingLabel(label: string | null | undefined): boolean {
  const n = (label || "").trim().toLowerCase().replace(/\s+/g, " ");
  return n === "air fare" || n === "airfare";
}

function parseNamedPrice(value: string | number | null | undefined): number {
  const n = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? roundInr(n) : 0;
}

function resolvePricingLabel(item: NamedPricingAmount): string {
  return (item.name || item.attributeName || "").trim();
}

/** Sum of Air Fare row prices (GST/discount excluded). */
export function sumAirFareAmount(items: NamedPricingAmount[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => {
    if (!isAirFarePricingLabel(resolvePricingLabel(item))) return sum;
    return sum + parseNamedPrice(item.price);
  }, 0);
}

/** Sum of non–Air Fare row prices (discount/GST base). */
export function sumTaxablePricingAmount(items: NamedPricingAmount[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => {
    if (isAirFarePricingLabel(resolvePricingLabel(item))) return sum;
    return sum + parseNamedPrice(item.price);
  }, 0);
}

/**
 * Apply discount to a taxable subtotal, then add Air Fare to the stored
 * GST-exclusive total (`afterDiscount + airFare`).
 */
export function computeVariantDiscountWithAirFare(
  taxableSubtotal: number,
  airFareAmount: number,
  input: VariantDiscountInput
): VariantDiscountResult & { airFareAmount: number } {
  const safeAirFare = Math.max(0, roundInr(parseNonNegativeNumber(airFareAmount)));
  const result = computeVariantDiscount(taxableSubtotal, input);
  return {
    ...result,
    totalCost: result.totalCost + safeAirFare,
    airFareAmount: safeAirFare,
  };
}

/** Seasonal / component totals with Air Fare excluded from GST. */
export type SeasonalPricingTotals = {
  taxableTotal: number;
  airFareTotal: number;
  gstAmount: number;
  /** GST-exclusive: taxable + air fare */
  totalExcludingGst: number;
  /** taxable + GST + air fare */
  grandTotal: number;
};

export function computeSeasonalPricingTotals(
  items: NamedPricingAmount[] | null | undefined
): SeasonalPricingTotals {
  const taxableTotal = sumTaxablePricingAmount(items);
  const airFareTotal = sumAirFareAmount(items);
  const gstAmount =
    taxableTotal > 0 ? roundInr(taxableTotal * (VARIANT_PRICING_GST_PERCENT / 100)) : 0;
  return {
    taxableTotal,
    airFareTotal,
    gstAmount,
    totalExcludingGst: taxableTotal + airFareTotal,
    grandTotal: taxableTotal + gstAmount + airFareTotal,
  };
}

/**
 * Compute discount amount and final total from a pre-discount subtotal.
 */
export function computeVariantDiscount(
  subtotal: number,
  input: VariantDiscountInput
): VariantDiscountResult {
  const safeSubtotal = Math.max(0, Math.round(parseNonNegativeNumber(subtotal)));
  const inputValue = parseNonNegativeNumber(input.inputValue);

  if (inputValue <= 0 || safeSubtotal <= 0) {
    return {
      amount: 0,
      totalCost: safeSubtotal,
      appliedDiscount: null,
      subtotalBeforeDiscount: safeSubtotal,
    };
  }

  let amount = 0;
  if (input.type === "percent") {
    const cappedPercent = Math.min(100, inputValue);
    amount = Math.round(safeSubtotal * (cappedPercent / 100));
  } else {
    amount = Math.min(safeSubtotal, Math.round(inputValue));
  }

  const totalCost = Math.max(0, safeSubtotal - amount);
  const reason = input.reason?.trim() || undefined;

  return {
    amount,
    totalCost,
    subtotalBeforeDiscount: safeSubtotal,
    appliedDiscount:
      amount > 0
        ? {
            type: input.type,
            inputValue: input.type === "percent" ? Math.min(100, inputValue) : amount,
            amount,
            ...(reason ? { reason } : {}),
          }
        : null,
  };
}

export function formatDiscountLabel(
  appliedDiscount: AppliedVariantDiscount | null | undefined
): string {
  if (!appliedDiscount || appliedDiscount.amount <= 0) return "Discount";

  const reasonSuffix = appliedDiscount.reason ? ` — ${appliedDiscount.reason}` : "";

  if (appliedDiscount.type === "percent") {
    return `Discount (${appliedDiscount.inputValue}%)${reasonSuffix}`;
  }

  return `Discount (Rs. ${appliedDiscount.amount.toLocaleString("en-IN")})${reasonSuffix}`;
}

export function hasAppliedVariantDiscount(
  appliedDiscount: AppliedVariantDiscount | null | undefined
): boolean {
  return !!appliedDiscount && appliedDiscount.amount > 0;
}

export type PricingComponentItem = {
  name: string;
  price: string;
  description: string;
  derivationFormula?: string;
};

export const LINE_DESCRIPTION_PATTERN =
  /^(\d+)\s+(.+?)\s×\s*Rs\.?\s*([\d,]+(?:\.\d+)?)\s*=\s*Rs\.?\s*([\d,]+(?:\.\d+)?)$/i;

const GENERATED_PRICING_LINE_PATTERN =
  /(?:− Discount \(\d+%\) Rs\. [\d,]+ = Rs\. [\d,]+ \+ GST \(5%\)|\+ GST \(5%\))/;

function parseComponentPrice(value: string | undefined): number {
  const n = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type PricingLineContext = {
  qty: number;
  label?: string;
};

/** Parse qty × rate descriptions to recover quantity context for line math. */
export function parsePricingLineContext(description: string | undefined | null): PricingLineContext {
  const match = (description ?? "").match(LINE_DESCRIPTION_PATTERN);
  if (!match) {
    return { qty: 1 };
  }
  const qty = Number.parseInt(match[1], 10);
  return {
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    label: match[2].trim(),
  };
}

export function isGeneratedPricingLineDescription(description: string | undefined | null): boolean {
  return GENERATED_PRICING_LINE_PATTERN.test(description ?? "");
}

export function computePricingLineAmounts(input: {
  unitBase: number;
  discountPercent?: number;
  qty?: number;
  gstPercent?: number;
}): PricingLineAmounts {
  const unitBase = Math.max(0, roundInr(parseNonNegativeNumber(input.unitBase)));
  const qty = Math.max(1, Math.round(parseNonNegativeNumber(input.qty ?? 1)));
  const discountPercent = Math.min(
    100,
    Math.max(0, parseNonNegativeNumber(input.discountPercent ?? 0))
  );
  const gstPercent = Math.max(0, parseNonNegativeNumber(input.gstPercent ?? VARIANT_PRICING_GST_PERCENT));

  const lineBase = roundInr(unitBase * qty);
  const discountAmount =
    discountPercent > 0 ? roundInr(lineBase * (discountPercent / 100)) : 0;
  const afterDiscount = Math.max(0, lineBase - discountAmount);
  const gstAmount = gstPercent > 0 ? roundInr(afterDiscount * (gstPercent / 100)) : 0;
  const netLineTotal = afterDiscount + gstAmount;
  const netUnitPrice = qty > 1 ? roundInr(netLineTotal / qty) : netLineTotal;

  return {
    unitBase,
    qty,
    lineBase,
    discountPercent,
    discountAmount,
    afterDiscount,
    gstAmount,
    netLineTotal,
    netUnitPrice,
  };
}

export function buildPricingLineDescription(
  amounts: PricingLineAmounts,
  options: { label?: string; excludeGstAndDiscount?: boolean } = {}
): string {
  const { qty, unitBase, lineBase, discountPercent, discountAmount, afterDiscount, gstAmount, netLineTotal } =
    amounts;
  const label = options.label?.trim();

  let prefix = formatInrAmount(unitBase);
  if (qty > 1 && label) {
    prefix = `${qty} ${label} × ${formatInrAmount(unitBase)} = ${formatInrAmount(lineBase)}`;
  }

  if (options.excludeGstAndDiscount) {
    return prefix;
  }

  if (discountPercent > 0) {
    return `${prefix} − Discount (${discountPercent}%) ${formatInrAmount(discountAmount)} = ${formatInrAmount(afterDiscount)} + GST (${VARIANT_PRICING_GST_PERCENT}%) ${formatInrAmount(gstAmount)} = ${formatInrAmount(netLineTotal)}`;
  }

  return `${prefix} + GST (${VARIANT_PRICING_GST_PERCENT}%) ${formatInrAmount(gstAmount)} = ${formatInrAmount(netLineTotal)}`;
}

/** Shallow-clone pricing breakdown rows for safe snapshots. */
export function clonePricingComponents(
  items: PricingComponentItem[]
): PricingComponentItem[] {
  return items.map((item) => ({ ...item }));
}

/**
 * Apply a percentage discount to each pricing breakdown row.
 * Keeps original base price; rebuilds description with discount + GST math.
 * Air Fare rows are left without discount or GST.
 */
export function applyPercentDiscountToPricingComponents(
  items: PricingComponentItem[],
  percent: number
): PricingComponentItem[] {
  const cappedPercent = Math.min(100, Math.max(0, parseNonNegativeNumber(percent)));
  if (cappedPercent <= 0) {
    return clonePricingComponents(items);
  }

  return items.map((item) => {
    const unitBase = parseComponentPrice(item.price);
    if (unitBase <= 0) {
      return { ...item };
    }

    const { qty, label } = parsePricingLineContext(item.description);
    if (isAirFarePricingLabel(item.name)) {
      const amounts = computePricingLineAmounts({
        unitBase,
        discountPercent: 0,
        qty,
        gstPercent: 0,
      });
      return {
        ...item,
        price: unitBase.toString(),
        description: buildPricingLineDescription(amounts, {
          label,
          excludeGstAndDiscount: true,
        }),
      };
    }

    const amounts = computePricingLineAmounts({
      unitBase,
      discountPercent: cappedPercent,
      qty,
    });

    return {
      ...item,
      price: unitBase.toString(),
      description: buildPricingLineDescription(amounts, { label }),
    };
  });
}

/** Build discount + GST description for a single component row (display/editor). */
export function buildComponentPricingDescription(
  unitBase: number,
  description: string | undefined | null,
  appliedDiscount?: AppliedVariantDiscount | null,
  options: { label?: string | null } = {}
): { description: string; netUnitPrice: number } {
  const { qty, label: qtyLabel } = parsePricingLineContext(description);
  const rowLabel = options.label?.trim() || "";
  const excludeAirFare = isAirFarePricingLabel(rowLabel);
  const discountPercent =
    !excludeAirFare &&
    appliedDiscount?.type === "percent" &&
    appliedDiscount.inputValue > 0
      ? appliedDiscount.inputValue
      : 0;
  const amounts = computePricingLineAmounts({
    unitBase,
    discountPercent,
    qty,
    gstPercent: excludeAirFare ? 0 : undefined,
  });
  return {
    description: buildPricingLineDescription(amounts, {
      label: qtyLabel,
      excludeGstAndDiscount: excludeAirFare,
    }),
    netUnitPrice: amounts.netUnitPrice,
  };
}
