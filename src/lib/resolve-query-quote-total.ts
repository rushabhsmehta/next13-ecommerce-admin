/**
 * Resolve the commercial quote total for a TourPackageQuery from variant pricing only.
 * General pricing fields (totalPrice / pricingSection) are intentionally not consulted.
 */

export type QueryQuoteSource = "confirmed" | "single_variant" | "none";

export type QueryQuoteLineItem = {
  name: string;
  price: string;
  description?: string | null;
};

export type ResolvedQueryQuote = {
  source: QueryQuoteSource;
  variantId: string | null;
  total: number | null;
  /** String form suitable for display / legacy callers that expected totalPrice text */
  totalDisplay: string | null;
  lineItems: QueryQuoteLineItem[];
};

type VariantPricingLike = {
  totalCost?: unknown;
  components?: Array<{
    name?: string;
    price?: string | number;
    description?: string | null;
  }> | null;
};

function parseTotalCost(entry: VariantPricingLike | null | undefined): number | null {
  if (!entry) return null;
  const raw = entry.totalCost;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw.replace(/[^\d.-]/g, ""))
        : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toLineItems(entry: VariantPricingLike | null | undefined): QueryQuoteLineItem[] {
  if (!entry || !Array.isArray(entry.components)) return [];
  return entry.components
    .filter((c) => c && (c.name || c.price != null))
    .map((c) => ({
      name: String(c.name ?? ""),
      price: c.price == null ? "" : String(c.price),
      description: c.description ?? null,
    }));
}

function normalizePricingMap(
  variantPricingData: unknown
): Record<string, VariantPricingLike> {
  if (!variantPricingData || typeof variantPricingData !== "object") return {};
  return variantPricingData as Record<string, VariantPricingLike>;
}

function pricedEntries(
  map: Record<string, VariantPricingLike>
): Array<{ variantId: string; total: number; entry: VariantPricingLike }> {
  const out: Array<{ variantId: string; total: number; entry: VariantPricingLike }> = [];
  for (const [variantId, entry] of Object.entries(map)) {
    const total = parseTotalCost(entry);
    if (total != null) out.push({ variantId, total, entry });
  }
  return out;
}

export function resolveQueryQuoteTotal(input: {
  confirmedVariantId?: string | null;
  variantPricingData?: unknown;
}): ResolvedQueryQuote {
  const map = normalizePricingMap(input.variantPricingData);
  const confirmedId = input.confirmedVariantId || null;

  if (confirmedId) {
    const entry = map[confirmedId];
    const total = parseTotalCost(entry);
    if (total != null) {
      return {
        source: "confirmed",
        variantId: confirmedId,
        total,
        totalDisplay: String(total),
        lineItems: toLineItems(entry),
      };
    }
  }

  const priced = pricedEntries(map);
  if (priced.length === 1) {
    const only = priced[0];
    return {
      source: "single_variant",
      variantId: only.variantId,
      total: only.total,
      totalDisplay: String(only.total),
      lineItems: toLineItems(only.entry),
    };
  }

  return {
    source: "none",
    variantId: null,
    total: null,
    totalDisplay: null,
    lineItems: [],
  };
}

/** True when there is a usable positive quote total from variants. */
export function hasResolvedQueryQuoteTotal(input: {
  confirmedVariantId?: string | null;
  variantPricingData?: unknown;
}): boolean {
  return resolveQueryQuoteTotal(input).total != null;
}
