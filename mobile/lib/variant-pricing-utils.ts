export type PackagePricingComponent = {
  id: string;
  price: number | string;
  pricingAttributeName?: string;
  pricingAttribute?: { name?: string };
  description?: string | null;
};

export type PackagePricingPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  mealPlanId: string;
  numberOfRooms: number;
  pricingComponents?: PackagePricingComponent[];
};

export function getOccupancyMultiplier(componentName: string): number {
  const name = componentName.toLowerCase();
  if (name.includes("quad")) return 4;
  if (name.includes("triple") || name.includes("extra bed") || name.includes("extra mattress")) {
    return 3;
  }
  if (name.includes("double") || name.includes("twin") || name.includes("couple")) return 2;
  if (name.includes("single") || (name.includes("per person") && !name.includes("extra"))) {
    return 1;
  }
  return 1;
}

export function calculateComponentTotalPrice(
  component: PackagePricingComponent,
  roomQuantity = 1
): number {
  const basePrice =
    typeof component.price === "number"
      ? component.price
      : Number.parseFloat(String(component.price || "0"));
  const componentName =
    component.pricingAttribute?.name || component.pricingAttributeName || "";
  const occupancyMultiplier = getOccupancyMultiplier(componentName);
  return basePrice * occupancyMultiplier * roomQuantity;
}

function toLocalDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type MatchPricingPeriodResult =
  | { ok: true; period: PackagePricingPeriod }
  | { ok: false; error: string };

/**
 * Filter tour package pricing periods to exactly one match (web parity).
 */
export function matchTourPackagePricingPeriod(
  periods: PackagePricingPeriod[],
  options: {
    queryStartDate: string | Date;
    queryEndDate: string | Date;
    mealPlanId: string;
    numberOfRooms: number;
  }
): MatchPricingPeriodResult {
  const start = toLocalDate(options.queryStartDate);
  const end = toLocalDate(options.queryEndDate);

  const matched = periods.filter((period) => {
    const periodStart = toLocalDate(period.startDate);
    const periodEnd = toLocalDate(period.endDate);
    const isDateMatch = start >= periodStart && end <= periodEnd;
    const isMealPlanMatch = period.mealPlanId === options.mealPlanId;
    const isRoomMatch = period.numberOfRooms === options.numberOfRooms;
    return isDateMatch && isMealPlanMatch && isRoomMatch;
  });

  if (matched.length === 0) {
    return {
      ok: false,
      error: "No pricing matched the selected meal plan, room count, and travel dates.",
    };
  }

  if (matched.length > 1) {
    return {
      ok: false,
      error:
        "Multiple pricing periods matched. Narrow the dates or adjust the package pricing setup.",
    };
  }

  return { ok: true, period: matched[0] };
}

export function applySelectedPackageComponents(
  components: PackagePricingComponent[],
  selectedIds: string[],
  quantitiesById: Record<string, number>
): {
  items: Array<{ name: string; price: string; description: string }>;
  /** Sum of all line totals including Air Fare (legacy). */
  totalPrice: number;
  /** Package total excluding Air Fare (discount/GST base). */
  taxableSubtotal: number;
  airFareTotal: number;
} {
  // Lazy import avoided — keep helper local to prevent circular deps in tests.
  const isAirFare = (label: string) => {
    const n = label.trim().toLowerCase().replace(/\s+/g, " ");
    return n === "air fare" || n === "airfare";
  };

  const selected = components.filter((comp) => selectedIds.includes(comp.id));
  const finalComponents: Array<{ name: string; price: string; description: string }> = [];
  let totalPrice = 0;
  let taxableSubtotal = 0;
  let airFareTotal = 0;

  for (const comp of selected) {
    const componentName = comp.pricingAttribute?.name || comp.pricingAttributeName || "Pricing Component";
    const basePrice =
      typeof comp.price === "number"
        ? comp.price
        : Number.parseFloat(String(comp.price || "0"));
    const roomQuantity = quantitiesById[comp.id] || 1;
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    const totalComponentPrice = calculateComponentTotalPrice(comp, roomQuantity);
    const airFare = isAirFare(componentName);

    finalComponents.push({
      name: componentName,
      price: (airFare ? totalComponentPrice : basePrice).toString(),
      description: `${basePrice.toFixed(2)} x ${occupancyMultiplier} occupancy${
        roomQuantity > 1 ? ` x ${roomQuantity} rooms` : ""
      } = Rs.${totalComponentPrice.toFixed(2)}`,
    });

    totalPrice += totalComponentPrice;
    if (airFare) {
      airFareTotal += totalComponentPrice;
    } else {
      taxableSubtotal += totalComponentPrice;
    }
  }

  return { items: finalComponents, totalPrice, taxableSubtotal, airFareTotal };
}

export function parseMoney(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatINR(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseMoney(value) : value ?? 0;
  if (!Number.isFinite(n) || n <= 0) return "Rs. 0";
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

export function pricingRowsTotal(
  rows: Array<{ price?: string | number | null }>
): number {
  return rows.reduce((sum, row) => sum + parseMoney(String(row.price ?? "")), 0);
}
