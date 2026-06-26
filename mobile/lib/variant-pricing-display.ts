export type PerGuestRate = {
  price: number | null;
  description: string;
};

export type PerPersonRatesResult = {
  nights: number;
  totalPax: number;
  mainPax: number;
  extraBedPax: number;
  cnbPax: number;
  infantPax: number;
  transportTotal: number;
  transportPerPerson: number;
  rates: {
    perPerson: PerGuestRate;
    perCouple: PerGuestRate;
    perPersonWithExtraBed: PerGuestRate;
    childWithMattress: PerGuestRate;
    childWithoutMattress: PerGuestRate;
    childBelow5WithSeat: PerGuestRate;
    childBelow5WithoutSeat: PerGuestRate;
  };
};

export type PricingItemInput = {
  name: string;
  price: string;
  description: string;
  derivationFormula?: string;
};

export function matchPricingItemRateKey(
  label: string
): keyof PerPersonRatesResult["rates"] | null {
  const l = (label || "").toLowerCase();
  if (l.includes("couple")) return "perCouple";
  if (l.includes("extra bed") || l.includes("extra mattress")) return "perPersonWithExtraBed";
  if (l.includes("child below 5") && (l.includes("without seat") || l.includes("no seat"))) {
    return "childBelow5WithoutSeat";
  }
  if (l.includes("child below 5") && l.includes("with seat")) return "childBelow5WithSeat";
  if (l.includes("child") && l.includes("without") && l.includes("mattress")) {
    return "childWithoutMattress";
  }
  if (l.includes("child") && l.includes("with") && l.includes("mattress")) {
    return "childWithMattress";
  }
  if (l.includes("per person")) return "perPerson";
  return null;
}

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
    if (key === "perCouple") return { qty: Math.ceil(apiMainPax / 2) || 0, label: "Couples" };
    if (key === "perPersonWithExtraBed") return { qty: apiExtraBedPax, label: "Extra Bed" };
    if (key === "childWithMattress" || key === "childWithoutMattress") {
      return { qty: numChild5to12, label: "Children" };
    }
    if (key === "childBelow5WithSeat") return { qty: apiCnbPax, label: "CNB" };
    if (key === "childBelow5WithoutSeat") return { qty: numChild0to5, label: "Children" };
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
