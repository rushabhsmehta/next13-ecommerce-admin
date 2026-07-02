export type VariantDiscountType = "percent" | "fixed";

export type AppliedVariantDiscount = {
  type: VariantDiscountType;
  inputValue: number;
  amount: number;
  reason?: string | null;
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
  if (!hasAppliedVariantDiscount(appliedDiscount) || !appliedDiscount) return "Discount";

  const amount = Number(appliedDiscount.amount);
  const reasonSuffix = appliedDiscount.reason ? ` — ${appliedDiscount.reason}` : "";

  if (appliedDiscount.type === "percent") {
    const pct = Number(appliedDiscount.inputValue);
    const pctLabel = Number.isFinite(pct) ? pct : 0;
    return `Discount (${pctLabel}%)${reasonSuffix}`;
  }

  return `Discount (Rs. ${Math.round(amount).toLocaleString("en-IN")})${reasonSuffix}`;
}

export function hasAppliedVariantDiscount(
  appliedDiscount: AppliedVariantDiscount | null | undefined
): boolean {
  if (!appliedDiscount) return false;
  const amount = Number(appliedDiscount.amount);
  return Number.isFinite(amount) && amount > 0;
}

export type PricingComponentItem = {
  name: string;
  price: string;
  description: string;
  derivationFormula?: string;
};

export const LINE_DESCRIPTION_PATTERN =
  /^(\d+)\s+(.+?)\s×\s*Rs\.?\s*([\d,]+(?:\.\d+)?)\s*=\s*Rs\.?\s*([\d,]+(?:\.\d+)?)$/i;

function parseComponentPrice(value: string | undefined): number {
  const n = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type PricingLineContext = {
  qty: number;
  label?: string;
};

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
  const gstPercent = Math.max(
    0,
    parseNonNegativeNumber(input.gstPercent ?? VARIANT_PRICING_GST_PERCENT)
  );

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
  options: { label?: string } = {}
): string {
  const {
    qty,
    unitBase,
    lineBase,
    discountPercent,
    discountAmount,
    afterDiscount,
    gstAmount,
    netLineTotal,
  } = amounts;
  const label = options.label?.trim();

  let prefix = formatInrAmount(unitBase);
  if (qty > 1 && label) {
    prefix = `${qty} ${label} × ${formatInrAmount(unitBase)} = ${formatInrAmount(lineBase)}`;
  }

  if (discountPercent > 0) {
    return `${prefix} − Discount (${discountPercent}%) ${formatInrAmount(discountAmount)} = ${formatInrAmount(afterDiscount)} + GST (${VARIANT_PRICING_GST_PERCENT}%) ${formatInrAmount(gstAmount)} = ${formatInrAmount(netLineTotal)}`;
  }

  return `${prefix} + GST (${VARIANT_PRICING_GST_PERCENT}%) ${formatInrAmount(gstAmount)} = ${formatInrAmount(netLineTotal)}`;
}

export function clonePricingComponents(items: PricingComponentItem[]): PricingComponentItem[] {
  return items.map((item) => ({ ...item }));
}

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
