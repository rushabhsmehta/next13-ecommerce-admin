import {
  VARIANT_PRICING_GST_PERCENT,
  formatInrAmount,
  isAirFarePricingLabel,
} from "@/lib/variant-pricing-discount";

export type BasePricingDiscountType = "percent" | "fixed";

export type BasePricingAdjustment = {
  schemaVersion: 1;
  discountType: BasePricingDiscountType;
  inputValue: number;
  reason?: string;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: 5;
  gstAmount: number;
  totalIncludingGst: number;
  calculatedAt: string;
};

export type BasePricingAdjustmentInput = {
  discountType: BasePricingDiscountType;
  inputValue: number | string;
  reason?: string | null;
  calculatedAt?: string;
};

export type BasePricingItem = {
  name?: string | null;
  price?: string | number | null;
  description?: string | null;
  pricingAdjustment?: BasePricingAdjustment | null;
  [key: string]: unknown;
};

type ParsedPricingLine = {
  item: BasePricingItem;
  unitBase: number;
  qty: number;
  label?: string;
  lineBase: number;
};

const BASE_FORMULA_PATTERN =
  /^\s*([\d,]+(?:\.\d+)?)\s*(?:x|\u00d7)\s*(\d+)\s*=\s*(?:Rs\.?|INR|\u20b9)?\s*[\d,]+(?:\.\d+)?\s*$/i;

const VARIANT_FORMULA_PATTERN =
  /^\s*(\d+)\s+(.+?)\s*(?:x|\u00d7)\s*(?:Rs\.?|INR|\u20b9)?\s*[\d,]+(?:\.\d+)?\s*=\s*(?:Rs\.?|INR|\u20b9)?\s*[\d,]+(?:\.\d+)?/i;

function parseNonNegativeNumber(value: unknown): number {
  const n =
    typeof value === "string"
      ? Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
      : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function roundInr(value: number): number {
  return Math.round(value);
}

function normalizeDiscountInput(input: BasePricingAdjustmentInput): {
  discountType: BasePricingDiscountType;
  inputValue: number;
  reason?: string;
} {
  const discountType = input.discountType === "fixed" ? "fixed" : "percent";
  const rawInput = parseNonNegativeNumber(input.inputValue);
  const inputValue = discountType === "percent" ? Math.min(100, rawInput) : roundInr(rawInput);
  const reason = input.reason?.trim() || undefined;

  return {
    discountType,
    inputValue,
    ...(reason ? { reason } : {}),
  };
}

function parseLineContext(item: BasePricingItem): { qty: number; label?: string } {
  const description = String(item.description ?? "");
  const variantMatch = description.match(VARIANT_FORMULA_PATTERN);
  if (variantMatch) {
    const qty = Number.parseInt(variantMatch[1], 10);
    return {
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      label: variantMatch[2]?.trim() || undefined,
    };
  }

  const baseMatch = description.match(BASE_FORMULA_PATTERN);
  if (baseMatch) {
    const qty = Number.parseInt(baseMatch[2], 10);
    return {
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      label: "passenger(s)",
    };
  }

  return { qty: 1 };
}

function parsePricingLines(items: BasePricingItem[]): ParsedPricingLine[] {
  return items
    .map((item) => {
      const unitBase = roundInr(parseNonNegativeNumber(item.price));
      const { qty, label } = parseLineContext(item);
      const safeQty = Math.max(1, roundInr(qty));
      return {
        item,
        unitBase,
        qty: safeQty,
        label,
        lineBase: unitBase * safeQty,
      };
    })
    .filter((line) => line.unitBase > 0 && line.lineBase > 0);
}

function buildLineDescription(
  line: ParsedPricingLine,
  input: {
    discountType: BasePricingDiscountType;
    lineDiscountAmount: number;
    gstAmount: number;
    taxableAmount: number;
    totalIncludingGst: number;
    percentInput?: number;
    excludeGstAndDiscount?: boolean;
  }
): string {
  const label = line.label?.trim() || (line.qty > 1 ? "unit(s)" : undefined);
  const prefix =
    line.qty > 1
      ? `${line.qty} ${label} x ${formatInrAmount(line.unitBase)} = ${formatInrAmount(line.lineBase)}`
      : formatInrAmount(line.unitBase);

  if (input.excludeGstAndDiscount) {
    return prefix;
  }

  const discountAmount = roundInr(input.lineDiscountAmount);
  const discountPart =
    discountAmount > 0
      ? input.discountType === "percent"
        ? ` - Discount (${input.percentInput ?? 0}%) ${formatInrAmount(discountAmount)} = ${formatInrAmount(input.taxableAmount)}`
        : ` - Discount (fixed share) ${formatInrAmount(discountAmount)} = ${formatInrAmount(input.taxableAmount)}`
      : "";

  return `${prefix}${discountPart} + GST (${VARIANT_PRICING_GST_PERCENT}%) ${formatInrAmount(input.gstAmount)} = ${formatInrAmount(input.totalIncludingGst)}`;
}

export function calculateBasePricingSubtotal(items: BasePricingItem[] | null | undefined): number {
  return parsePricingLines(items ?? []).reduce((sum, line) => sum + line.lineBase, 0);
}

export function getFirstPricingAdjustment(
  items: BasePricingItem[] | null | undefined
): BasePricingAdjustment | null {
  const adjustment = (items ?? [])
    .map((item) => item?.pricingAdjustment)
    .find((value): value is BasePricingAdjustment =>
      !!value && typeof value === "object" && value.schemaVersion === 1
    );
  return adjustment ?? null;
}

export function hasBasePricingAdjustment(items: BasePricingItem[] | null | undefined): boolean {
  return !!getFirstPricingAdjustment(items);
}

export function clearBasePricingAdjustment<T extends BasePricingItem>(
  items: T[] | null | undefined
): T[] {
  return (items ?? []).map((item) => {
    const { pricingAdjustment: _pricingAdjustment, ...rest } = item;
    return rest as T;
  });
}

export function applyBasePricingAdjustment<T extends BasePricingItem>(
  items: T[] | null | undefined,
  input: BasePricingAdjustmentInput
): { items: T[]; adjustment: BasePricingAdjustment } {
  const sourceItems = items ?? [];
  const lines = parsePricingLines(sourceItems);
  const taxableLines = lines.filter((line) => !isAirFarePricingLabel(String(line.item.name ?? "")));
  const airFareLines = lines.filter((line) => isAirFarePricingLabel(String(line.item.name ?? "")));
  const airFareTotal = airFareLines.reduce((sum, line) => sum + line.lineBase, 0);
  const normalized = normalizeDiscountInput(input);
  const subtotalBeforeDiscount = taxableLines.reduce((sum, line) => sum + line.lineBase, 0);

  let targetDiscountAmount = 0;
  if (subtotalBeforeDiscount > 0) {
    targetDiscountAmount =
      normalized.discountType === "percent"
        ? roundInr(subtotalBeforeDiscount * (normalized.inputValue / 100))
        : Math.min(subtotalBeforeDiscount, normalized.inputValue);
  }

  const lineDiscounts = new Map<BasePricingItem, number>();
  let allocatedDiscount = 0;

  taxableLines.forEach((line, index) => {
    const remainingDiscount = Math.max(0, targetDiscountAmount - allocatedDiscount);
    const lineDiscount =
      index === taxableLines.length - 1
        ? remainingDiscount
        : Math.min(
            line.lineBase,
            roundInr(
              subtotalBeforeDiscount > 0
                ? targetDiscountAmount * (line.lineBase / subtotalBeforeDiscount)
                : 0
            )
          );
    lineDiscounts.set(line.item, lineDiscount);
    allocatedDiscount += lineDiscount;
  });

  let taxableAmount = 0;
  let gstAmount = 0;
  let totalIncludingGst = 0;

  const lineResults = new Map<
    BasePricingItem,
    {
      lineDiscountAmount: number;
      taxableAmount: number;
      gstAmount: number;
      totalIncludingGst: number;
      excludeGstAndDiscount?: boolean;
    }
  >();

  taxableLines.forEach((line) => {
    const lineDiscountAmount = Math.min(line.lineBase, lineDiscounts.get(line.item) ?? 0);
    const lineTaxableAmount = Math.max(0, line.lineBase - lineDiscountAmount);
    const lineGstAmount = roundInr(lineTaxableAmount * (VARIANT_PRICING_GST_PERCENT / 100));
    const lineTotalIncludingGst = lineTaxableAmount + lineGstAmount;

    taxableAmount += lineTaxableAmount;
    gstAmount += lineGstAmount;
    totalIncludingGst += lineTotalIncludingGst;
    lineResults.set(line.item, {
      lineDiscountAmount,
      taxableAmount: lineTaxableAmount,
      gstAmount: lineGstAmount,
      totalIncludingGst: lineTotalIncludingGst,
    });
  });

  airFareLines.forEach((line) => {
    lineResults.set(line.item, {
      lineDiscountAmount: 0,
      taxableAmount: line.lineBase,
      gstAmount: 0,
      totalIncludingGst: line.lineBase,
      excludeGstAndDiscount: true,
    });
  });

  totalIncludingGst += airFareTotal;

  const adjustment: BasePricingAdjustment = {
    schemaVersion: 1,
    discountType: normalized.discountType,
    inputValue: normalized.inputValue,
    ...(normalized.reason ? { reason: normalized.reason } : {}),
    subtotalBeforeDiscount,
    discountAmount: targetDiscountAmount,
    taxableAmount,
    gstPercent: VARIANT_PRICING_GST_PERCENT,
    gstAmount,
    totalIncludingGst,
    calculatedAt: input.calculatedAt ?? new Date().toISOString(),
  };

  return {
    adjustment,
    items: sourceItems.map((item) => {
      const line = lines.find((candidate) => candidate.item === item);
      const result = line ? lineResults.get(item) : null;
      if (!line || !result) {
        const { pricingAdjustment: _pricingAdjustment, ...rest } = item;
        return rest as T;
      }

      return {
        ...item,
        price: String(line.unitBase),
        description: buildLineDescription(line, {
          discountType: normalized.discountType,
          lineDiscountAmount: result.lineDiscountAmount,
          gstAmount: result.gstAmount,
          taxableAmount: result.taxableAmount,
          totalIncludingGst: result.totalIncludingGst,
          percentInput: normalized.discountType === "percent" ? normalized.inputValue : undefined,
          excludeGstAndDiscount: result.excludeGstAndDiscount,
        }),
        pricingAdjustment: adjustment,
      } as T;
    }),
  };
}
