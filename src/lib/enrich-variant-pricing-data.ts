import {
  applyPerPersonRatesToPricingItems,
  type VariantPricingEntry,
} from "@/lib/variant-pricing-display";
import { calculateVariantPricing, derivePerPersonRates } from "@/lib/pricing-calculator";
import { DEFAULT_PRICING_SECTION } from "@/components/tour-package-query/defaultValues";

type EnrichableQuery = {
  tourStartsFrom?: Date | string | null;
  tourEndsOn?: Date | string | null;
  itineraries?: Array<{
    id: string;
    dayNumber?: number | null;
    locationId?: string | null;
    hotelId?: string | null;
  }>;
  variantRoomAllocations?: Record<string, Record<string, unknown[]>> | null;
  variantTransportDetails?: Record<string, Record<string, unknown[]>> | null;
  variantPricingData?: Record<string, VariantPricingEntry & Record<string, unknown>> | null;
  variantHotelOverrides?: Record<string, Record<string, string>> | null;
};

function cloneDefaultPricingItems() {
  return DEFAULT_PRICING_SECTION.map((item) => ({ ...item }));
}

function hasPricedGuestComponents(entry: VariantPricingEntry | undefined): boolean {
  if (!Array.isArray(entry?.components)) return false;
  return entry.components.some((comp) => {
    const name = (comp.name || "").toLowerCase();
    if (name === "total cost" || name === "accommodation" || name === "transport") return false;
    const price = parseFloat(String(comp.price ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(price) && price > 0;
  });
}

/**
 * Fill missing per-guest breakdown rows on read so variant display/PDF can show
 * per-person and extra-bed rates even when only totalCost was saved earlier.
 */
export async function enrichVariantPricingData(
  query: EnrichableQuery
): Promise<Record<string, VariantPricingEntry & Record<string, unknown>> | null | undefined> {
  const raw = query.variantPricingData;
  if (!raw || typeof raw !== "object") return raw ?? undefined;

  const tourStartsFrom = query.tourStartsFrom;
  const tourEndsOn = query.tourEndsOn;
  const itineraries = query.itineraries || [];
  if (!tourStartsFrom || !tourEndsOn || itineraries.length === 0) return raw;

  const enriched: Record<string, VariantPricingEntry & Record<string, unknown>> = {
    ...raw,
  };

  for (const [variantId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.perPersonRates?.rates || hasPricedGuestComponents(entry)) continue;
    if (!entry.totalCost && (entry as { calculationMethod?: string }).calculationMethod !== "autoHotelTransport") continue;

    const roomAllocationsByItinerary = query.variantRoomAllocations?.[variantId];
    if (!roomAllocationsByItinerary) continue;

    const pricingItineraries = itineraries.map((itinerary, idx) => ({
      locationId: itinerary.locationId || "",
      dayNumber: itinerary.dayNumber || idx + 1,
      hotelId:
        query.variantHotelOverrides?.[variantId]?.[itinerary.id] ||
        itinerary.hotelId ||
        undefined,
      roomAllocations: (roomAllocationsByItinerary[itinerary.id] as any[]) || [],
      transportDetails:
        (query.variantTransportDetails?.[variantId]?.[itinerary.id] as any[]) || [],
    }));

    if (!pricingItineraries.some((it) => (it.roomAllocations?.length || 0) > 0)) continue;

    try {
      const calculationResult = await calculateVariantPricing({
        variantId,
        variantRoomAllocations: query.variantRoomAllocations,
        variantTransportDetails: query.variantTransportDetails,
        itineraries: pricingItineraries,
        tourStartsFrom,
        tourEndsOn,
        markup: (entry as { appliedMarkup?: { percentage?: number } }).appliedMarkup?.percentage ?? 0,
      });

      const perPersonRates = await derivePerPersonRates({
        calculationResult,
        itineraries: pricingItineraries,
        tourStartsFrom,
        tourEndsOn,
      });

      const baseItems =
        Array.isArray(entry.components) && entry.components.length > 0
          ? entry.components.map((comp) => ({
              name: comp.name || "",
              price: String(comp.price ?? ""),
              description: comp.description || "",
            }))
          : cloneDefaultPricingItems();

      enriched[variantId] = {
        ...entry,
        perPersonRates,
        components: applyPerPersonRatesToPricingItems(baseItems, perPersonRates),
        totalCost: entry.totalCost ?? calculationResult.totalCost,
      };
    } catch (error) {
      console.log("[ENRICH_VARIANT_PRICING]", variantId, error);
    }
  }

  return enriched;
}
