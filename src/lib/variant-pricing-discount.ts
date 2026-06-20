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

function parseNonNegativeNumber(value: unknown): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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

const LINE_DESCRIPTION_PATTERN =
  /^(\d+)\s+(.+?)\s×\s*Rs\.?\s*([\d,]+(?:\.\d+)?)\s*=\s*Rs\.?\s*([\d,]+(?:\.\d+)?)$/i;

function parseComponentPrice(value: string | undefined): number {
  const n = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function rebuildLineDescription(
  qty: number,
  label: string,
  unitPrice: number,
  lineTotal: number
): string {
  return `${qty} ${label} × Rs.${unitPrice.toLocaleString("en-IN")} = Rs.${lineTotal.toLocaleString("en-IN")}`;
}

/** Shallow-clone pricing breakdown rows for safe snapshots. */
export function clonePricingComponents(
  items: PricingComponentItem[]
): PricingComponentItem[] {
  return items.map((item) => ({ ...item }));
}

/**
 * Apply a percentage discount to each pricing breakdown row's base price.
 * Rebuilds auto-generated descriptions when they match the standard qty × rate = total pattern.
 */
export function applyPercentDiscountToPricingComponents(
  items: PricingComponentItem[],
  percent: number
): PricingComponentItem[] {
  const cappedPercent = Math.min(100, Math.max(0, parseNonNegativeNumber(percent)));
  if (cappedPercent <= 0) {
    return clonePricingComponents(items);
  }

  const multiplier = 1 - cappedPercent / 100;

  return items.map((item) => {
    const oldPrice = parseComponentPrice(item.price);
    if (oldPrice <= 0) {
      return { ...item };
    }

    const newPrice = Math.round(oldPrice * multiplier);
    const description = item.description ?? "";
    const match = description.match(LINE_DESCRIPTION_PATTERN);

    if (match) {
      const qty = Number.parseInt(match[1], 10);
      const label = match[2].trim();
      const newTotal = newPrice * qty;
      return {
        ...item,
        price: newPrice.toString(),
        description: rebuildLineDescription(qty, label, newPrice, newTotal),
      };
    }

    return {
      ...item,
      price: newPrice.toString(),
    };
  });
}
