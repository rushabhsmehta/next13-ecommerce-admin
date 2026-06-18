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
