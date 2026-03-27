/**
 * Build Synthetic Variant Snapshots
 *
 * When queryVariantSnapshots are missing or empty (e.g. snapshot creation
 * failed silently or pricing was set via JSON fields), this utility
 * constructs variant snapshot-like objects from the JSON data stored on
 * the TourPackageQuery so the display/PDF pages can render them.
 */

interface SyntheticHotelSnapshot {
  id: string;
  dayNumber: number;
  hotelId: string;
  hotelName: string;
  locationLabel: string;
  imageUrl: string | null;
  roomCategory: string | null;
}

interface SyntheticPricingComponentSnapshot {
  id: string;
  attributeName: string;
  price: any;
  purchasePrice: any;
  description: string | null;
  createdAt: Date;
}

interface SyntheticPricingSnapshot {
  id: string;
  mealPlanName: string;
  vehicleTypeName: string | null;
  numberOfRooms: number;
  totalPrice: any;
  isGroupPricing: boolean;
  description: string | null;
  pricingComponentSnapshots: SyntheticPricingComponentSnapshot[];
}

interface SyntheticVariantSnapshot {
  id: string;
  sourceVariantId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  priceModifier: number | null;
  hotelSnapshots: SyntheticHotelSnapshot[];
  pricingSnapshots: SyntheticPricingSnapshot[];
}

interface HotelData {
  id: string;
  name: string;
  location: { label: string };
  images: { url: string }[];
}

interface VariantWithMappings {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  priceModifier: number | null;
  variantHotelMappings?: {
    hotelId: string;
    hotel: HotelData;
    itinerary: { dayNumber: number | null } | null;
  }[];
}

interface ItineraryWithDay {
  id: string;
  dayNumber: number | null;
}

/**
 * Build synthetic variant snapshots from JSON fields + PackageVariant metadata.
 *
 * @param selectedVariantIds - Array of PackageVariant IDs
 * @param packageVariants - Full PackageVariant records with hotel mappings
 * @param variantHotelOverrides - JSON: { variantId: { itineraryId: hotelId } }
 * @param variantPricingData - JSON: { variantId: { components, totalCost, remarks } }
 * @param customQueryVariants - JSON: [{ id, name, description, ... }]
 * @param itineraries - Current query itineraries (for dayNumber resolution)
 * @param hotels - All hotels for hotel info lookup
 */
export function buildSyntheticSnapshots({
  selectedVariantIds,
  packageVariants,
  variantHotelOverrides,
  variantPricingData,
  customQueryVariants,
  itineraries,
  hotels,
}: {
  selectedVariantIds?: string[] | null;
  packageVariants: VariantWithMappings[];
  variantHotelOverrides?: Record<string, Record<string, string>> | null;
  variantPricingData?: Record<string, any> | null;
  customQueryVariants?: any[] | null;
  itineraries: ItineraryWithDay[];
  hotels: HotelData[];
}): SyntheticVariantSnapshot[] {
  const result: SyntheticVariantSnapshot[] = [];
  const hotelMap = new Map(hotels.map(h => [h.id, h]));

  // Build itineraryId → dayNumber map
  const itineraryDayMap: Record<string, number> = {};
  for (const it of itineraries) {
    if (it.dayNumber != null) {
      itineraryDayMap[it.id] = it.dayNumber;
    }
  }

  // Process template-derived variants
  const idsToProcess = (selectedVariantIds || []).filter(Boolean);
  for (const variantId of idsToProcess) {
    const pv = packageVariants.find(v => v.id === variantId);
    if (!pv) continue;

    const snapshot = buildOneSnapshot(
      pv.id,
      pv.id,
      pv.name,
      pv.description,
      pv.isDefault,
      pv.sortOrder,
      pv.priceModifier,
      pv.variantHotelMappings || [],
      variantHotelOverrides?.[pv.id],
      variantPricingData?.[pv.id],
      itineraryDayMap,
      hotelMap,
    );
    result.push(snapshot);
  }

  // Process custom query variants (standalone, not from a TourPackage)
  if (customQueryVariants && Array.isArray(customQueryVariants)) {
    for (let i = 0; i < customQueryVariants.length; i++) {
      const cv = customQueryVariants[i];
      if (!cv?.id) continue;
      // Skip if already processed as a template variant
      if (idsToProcess.includes(cv.id)) continue;

      const snapshot = buildOneSnapshot(
        cv.id,
        cv.id,
        cv.name || `Custom Variant ${i + 1}`,
        cv.description || null,
        cv.isDefault || false,
        cv.sortOrder ?? (idsToProcess.length + i),
        cv.priceModifier ?? null,
        [], // No template hotel mappings for custom variants
        variantHotelOverrides?.[cv.id],
        variantPricingData?.[cv.id],
        itineraryDayMap,
        hotelMap,
      );
      result.push(snapshot);
    }
  }

  // Sort by sortOrder
  result.sort((a, b) => a.sortOrder - b.sortOrder);

  return result;
}

function buildOneSnapshot(
  id: string,
  sourceVariantId: string,
  name: string,
  description: string | null,
  isDefault: boolean,
  sortOrder: number,
  priceModifier: number | null,
  templateHotelMappings: VariantWithMappings['variantHotelMappings'] & {},
  hotelOverrides: Record<string, string> | undefined,
  pricingEntry: any | undefined,
  itineraryDayMap: Record<string, number>,
  hotelMap: Map<string, HotelData>,
): SyntheticVariantSnapshot {
  // --- Build hotel snapshots ---
  const hotelSnapshots: SyntheticHotelSnapshot[] = [];
  const processedDays = new Set<number>();

  // First, apply query-level hotel overrides (these take priority)
  if (hotelOverrides) {
    for (const [itineraryId, hotelId] of Object.entries(hotelOverrides)) {
      const dayNumber = itineraryDayMap[itineraryId];
      if (dayNumber == null) continue;
      const hotel = hotelMap.get(hotelId);
      if (!hotel) continue;

      hotelSnapshots.push({
        id: `synth-hotel-${id}-${dayNumber}`,
        dayNumber,
        hotelId: hotel.id,
        hotelName: hotel.name,
        locationLabel: hotel.location?.label || '',
        imageUrl: hotel.images?.[0]?.url || null,
        roomCategory: null,
      });
      processedDays.add(dayNumber);
    }
  }

  // Then, fill in from template hotel mappings for days not overridden
  for (const mapping of templateHotelMappings) {
    const dayNumber = mapping.itinerary?.dayNumber;
    if (dayNumber == null || processedDays.has(dayNumber)) continue;

    hotelSnapshots.push({
      id: `synth-hotel-${id}-${dayNumber}`,
      dayNumber,
      hotelId: mapping.hotelId,
      hotelName: mapping.hotel?.name || 'Unknown Hotel',
      locationLabel: mapping.hotel?.location?.label || '',
      imageUrl: mapping.hotel?.images?.[0]?.url || null,
      roomCategory: null,
    });
    processedDays.add(dayNumber);
  }

  // Sort by dayNumber
  hotelSnapshots.sort((a, b) => a.dayNumber - b.dayNumber);

  // --- Build pricing snapshots from variantPricingData JSON ---
  const pricingSnapshots: SyntheticPricingSnapshot[] = [];

  if (pricingEntry) {
    const components: SyntheticPricingComponentSnapshot[] = [];
    if (Array.isArray(pricingEntry.components)) {
      pricingEntry.components.forEach((comp: any, idx: number) => {
        components.push({
          id: `synth-comp-${id}-${idx}`,
          attributeName: comp.name || comp.attributeName || `Component ${idx + 1}`,
          price: parseFloat(comp.price || '0'),
          purchasePrice: null,
          description: comp.description || null,
          createdAt: new Date(),
        });
      });
    }

    const totalCost = pricingEntry.totalCost || 0;

    pricingSnapshots.push({
      id: `synth-pricing-${id}`,
      mealPlanName: pricingEntry.mealPlanName || 'Package Pricing',
      vehicleTypeName: pricingEntry.vehicleTypeName || null,
      numberOfRooms: pricingEntry.numberOfRooms || 1,
      totalPrice: totalCost,
      isGroupPricing: false,
      description: pricingEntry.remarks || null,
      pricingComponentSnapshots: components,
    });
  }

  return {
    id: `synth-${id}`,
    sourceVariantId,
    name,
    description,
    isDefault,
    sortOrder,
    priceModifier,
    hotelSnapshots,
    pricingSnapshots,
  };
}
