// filepath: src/lib/pricing-calculator.ts
/**
 * Pricing Calculator Service
 * 
 * Shared service for calculating tour package pricing across the application.
 * Supports both regular Tour Package Queries and variant-specific pricing.
 * 
 * @module PricingCalculator
 */

import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';

/**
 * Extra bed entry within a room allocation
 */
export interface ExtraBedAllocation {
  occupancyTypeId: string;
  quantity?: number; // independent count for this occupancy type; defaults to 1
  occupancyTypeName?: string; // populated when includeNames=true
}

/**
 * Room allocation for pricing calculation
 */
export interface RoomAllocation {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  quantity: number;
  extraBeds?: ExtraBedAllocation[];
  guestNames?: string;
  voucherNumber?: string;
}

/**
 * Transport detail for pricing calculation
 */
export interface TransportDetail {
  vehicleTypeId: string;
  quantity: number;
  description?: string;
}

/**
 * Itinerary input for pricing calculation
 */
export interface PricingItinerary {
  locationId: string;
  dayNumber: number;
  hotelId?: string;
  roomAllocations: RoomAllocation[];
  transportDetails: TransportDetail[];
}

/**
 * Extra bed cost breakdown within a room
 */
export interface ExtraBedCostDetail {
  occupancyTypeId: string;
  occupancyTypeName?: string;
  pricePerNight: number;
  quantity: number;   // same as parent room quantity
  totalCost: number;  // pricePerNight × quantity
}

/**
 * Detailed room cost breakdown
 */
export interface RoomCostDetail {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  quantity: number;
  pricePerNight: number;
  totalCost: number;
  roomTypeName?: string;
  occupancyTypeName?: string;
  mealPlanName?: string;
  extraBedCosts?: ExtraBedCostDetail[];
  extraBedTotalCost?: number;
}

/**
 * Transport cost detail
 */
export interface TransportCostDetail {
  day: number;
  vehicleTypeId: string;
  vehicleType: string;
  quantity: number;
  pricePerUnit: number;
  pricingType: string;
  totalCost: number;
}

/**
 * Per-day pricing breakdown
 */
export interface DayPricingResult {
  day: number;
  accommodationCost: number;
  transportCost: number;
  totalCost: number;
  roomBreakdown: RoomCostDetail[];
  hotelName?: string;
}

/**
 * Complete pricing calculation result
 */
export interface PricingCalculationResult {
  totalCost: number;
  basePrice: number;
  appliedMarkup: {
    percentage: number;
    amount: number;
  };
  breakdown: {
    accommodation: number;
    transport: number;
  };
  itineraryBreakdown: DayPricingResult[];
  transportDetails: TransportCostDetail[];
  calculatedAt: Date;
}

/**
 * Options for pricing calculation
 */
export interface PricingCalculationOptions {
  tourStartsFrom: Date | string;
  tourEndsOn: Date | string;
  itineraries: PricingItinerary[];
  markup?: number; // Percentage markup (e.g., 10 for 10%)
  includeNames?: boolean; // Include room type/occupancy/meal plan names in response
}

/**
 * Calculate pricing for tour package based on itineraries, rooms, and transport
 * 
 * @param options - Pricing calculation options
 * @returns Complete pricing breakdown
 */
export async function calculatePricing(
  options: PricingCalculationOptions
): Promise<PricingCalculationResult> {
  const {
    tourStartsFrom,
    tourEndsOn,
    itineraries,
    markup = 0,
    includeNames = false
  } = options;

  // Convert dates to UTC for consistent database queries
  const startDate = dateToUtc(tourStartsFrom) || new Date();
  const endDate = dateToUtc(tourEndsOn) || new Date();

  // Initialize result structure
  const result: PricingCalculationResult = {
    totalCost: 0,
    basePrice: 0,
    appliedMarkup: {
      percentage: 0,
      amount: 0,
    },
    breakdown: {
      accommodation: 0,
      transport: 0,
    },
    itineraryBreakdown: [],
    transportDetails: [],
    calculatedAt: new Date()
  };

  // Fetch lookup data if names are requested
  let roomTypes: any[] = [];
  let occupancyTypes: any[] = [];
  let mealPlans: any[] = [];

  if (includeNames) {
    [roomTypes, occupancyTypes, mealPlans] = await Promise.all([
      prismadb.roomType.findMany({ where: { isActive: true } }),
      prismadb.occupancyType.findMany({ where: { isActive: true } }),
      prismadb.mealPlan.findMany({ where: { isActive: true } })
    ]);
  }

  // Process each itinerary day
  for (const itinerary of itineraries) {
    const { hotelId, locationId, dayNumber, roomAllocations, transportDetails } = itinerary;

    const dayResult: DayPricingResult = {
      day: dayNumber,
      accommodationCost: 0,
      transportCost: 0,
      totalCost: 0,
      roomBreakdown: []
    };

    // Fetch hotel name for display
    if (hotelId && includeNames) {
      const hotel = await prismadb.hotel.findUnique({ where: { id: hotelId }, select: { name: true } });
      if (hotel) dayResult.hotelName = hotel.name;
    }

    // Calculate accommodation costs
    if (hotelId && roomAllocations && roomAllocations.length > 0) {
      for (const room of roomAllocations) {
        const { quantity, roomTypeId, occupancyTypeId, mealPlanId, extraBeds } = room;

        if (!quantity || quantity <= 0) continue;

        // Find applicable hotel pricing
        const pricing = await prismadb.hotelPricing.findFirst({
          where: {
            hotelId,
            roomTypeId,
            occupancyTypeId,
            mealPlanId,
            isActive: true,
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          },
          orderBy: {
            startDate: 'desc'
          }
        });

        if (pricing) {
          const roomCost = pricing.price * quantity;

          const roomCostDetail: RoomCostDetail = {
            roomTypeId,
            occupancyTypeId,
            mealPlanId,
            quantity,
            pricePerNight: pricing.price,
            totalCost: roomCost,
            extraBedCosts: [],
            extraBedTotalCost: 0
          };

          // Add names if requested
          if (includeNames) {
            roomCostDetail.roomTypeName = roomTypes.find(rt => rt.id === roomTypeId)?.name;
            roomCostDetail.occupancyTypeName = occupancyTypes.find(ot => ot.id === occupancyTypeId)?.name;
            roomCostDetail.mealPlanName = mealPlans.find(mp => mp.id === mealPlanId)?.name;
          }

          // Calculate extra bed costs (each extra bed slot × quantity rooms)
          if (extraBeds && extraBeds.length > 0) {
            for (const eb of extraBeds) {
              if (!eb.occupancyTypeId) continue;

              // Extra bed pricing lookup: hotel + occupancyType + mealPlan (no roomTypeId filter)
              const ebPricing = await prismadb.hotelPricing.findFirst({
                where: {
                  hotelId,
                  occupancyTypeId: eb.occupancyTypeId,
                  mealPlanId,
                  isActive: true,
                  startDate: { lte: endDate },
                  endDate: { gte: startDate }
                },
                orderBy: { startDate: 'desc' }
              });

              if (ebPricing) {
                const ebQuantity = eb.quantity && eb.quantity > 0 ? eb.quantity : 1;
                const ebCost = ebPricing.price * ebQuantity;
                const ebDetail: ExtraBedCostDetail = {
                  occupancyTypeId: eb.occupancyTypeId,
                  pricePerNight: ebPricing.price,
                  quantity: ebQuantity,
                  totalCost: ebCost
                };

                if (includeNames) {
                  ebDetail.occupancyTypeName = occupancyTypes.find(ot => ot.id === eb.occupancyTypeId)?.name;
                }

                roomCostDetail.extraBedCosts!.push(ebDetail);
                roomCostDetail.extraBedTotalCost! += ebCost;
                dayResult.accommodationCost += ebCost;
              } else {
                const occupancyName = occupancyTypes.find(ot => ot.id === eb.occupancyTypeId)?.name || eb.occupancyTypeId;
                console.warn(`[PRICING_CALCULATOR] No pricing found for extra bed: occupancyType="${occupancyName}", hotel="${hotelId}", mealPlan="${mealPlanId}", dates=${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);
              }
            }
          }

          dayResult.roomBreakdown.push(roomCostDetail);
          dayResult.accommodationCost += roomCost;
        }
      }
    }

    // Calculate transport costs
    if (transportDetails && transportDetails.length > 0) {
      for (const transport of transportDetails) {
        const { vehicleTypeId, quantity = 1 } = transport;

        if (!vehicleTypeId) continue;

        // Find applicable transport pricing
        const transportPricing = await prismadb.transportPricing.findFirst({
          where: {
            locationId,
            vehicleTypeId,
            isActive: true,
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          },
          include: {
            vehicleType: true
          },
          orderBy: {
            startDate: 'desc'
          }
        });

        if (transportPricing && transportPricing.vehicleType) {
          let vehicleCost = 0;

          // Calculate based on pricing type
          if (transportPricing.transportType === "PerDay") {
            vehicleCost = transportPricing.price * quantity;
          } else {
            // For other types (PerTrip, etc.), use base price * quantity
            vehicleCost = transportPricing.price * quantity;
          }

          dayResult.transportCost += vehicleCost;

          result.transportDetails.push({
            day: dayNumber,
            vehicleTypeId: vehicleTypeId,
            vehicleType: transportPricing.vehicleType.name,
            quantity: quantity,
            pricePerUnit: transportPricing.price,
            pricingType: transportPricing.transportType,
            totalCost: vehicleCost
          });
        }
      }
    }

    // Calculate day total
    dayResult.totalCost = dayResult.accommodationCost + dayResult.transportCost;
    
    // Add to overall breakdown
    result.breakdown.accommodation += dayResult.accommodationCost;
    result.breakdown.transport += dayResult.transportCost;
    result.totalCost += dayResult.totalCost;
    
    result.itineraryBreakdown.push(dayResult);
  }

  // Apply markup
  const baseTotal = result.totalCost;
  const markupPercentage = typeof markup === 'string' ? parseFloat(markup) : markup;
  const markupAmount = baseTotal * (markupPercentage / 100);
  const totalWithMarkup = baseTotal + markupAmount;

  result.totalCost = Math.round(totalWithMarkup);
  result.basePrice = baseTotal;
  result.appliedMarkup = {
    percentage: markupPercentage,
    amount: markupAmount
  };

  return result;
}

/**
 * Calculate pricing for a specific variant's configuration
 * 
 * @param variantId - Package variant ID
 * @param variantRoomAllocations - Variant-specific room allocations (JSON structure)
 * @param variantTransportDetails - Variant-specific transport details (JSON structure)
 * @param tourStartsFrom - Tour start date
 * @param tourEndsOn - Tour end date
 * @param markup - Optional markup percentage
 * @returns Complete pricing breakdown for the variant
 */
export async function calculateVariantPricing(params: {
  variantId: string;
  variantRoomAllocations: any; // JSON structure: {variantId: {itineraryId: [{room}]}}
  variantTransportDetails: any; // JSON structure: {variantId: {itineraryId: [{transport}]}}
  itineraries: any[]; // Full itinerary data with locationId, hotelId, etc.
  tourStartsFrom: Date | string;
  tourEndsOn: Date | string;
  markup?: number;
}): Promise<PricingCalculationResult> {
  const {
    variantId,
    variantRoomAllocations,
    variantTransportDetails,
    itineraries,
    tourStartsFrom,
    tourEndsOn,
    markup = 0
  } = params;

  // Extract variant-specific data
  const variantRooms = variantRoomAllocations?.[variantId] || {};
  const variantTransport = variantTransportDetails?.[variantId] || {};

  // Build pricing itineraries from variant data
  // Use pre-computed roomAllocations/transportDetails already embedded in each itinerary object
  // (the frontend correctly resolves these from variantRoomAllocations[variantId][itinerary.id])
  const pricingItineraries: PricingItinerary[] = itineraries.map((itinerary: any) => {
    return {
      locationId: itinerary.locationId,
      dayNumber: itinerary.dayNumber,
      hotelId: itinerary.hotelId,
      roomAllocations: itinerary.roomAllocations || [],
      transportDetails: itinerary.transportDetails || []
    };
  });

  // Use the main pricing calculator
  return calculatePricing({
    tourStartsFrom,
    tourEndsOn,
    itineraries: pricingItineraries,
    markup,
    includeNames: true
  });
}

/**
 * One line of the per-guest pricing breakdown sheet.
 * `price === null` means a required hotel rate is missing — render the row blank.
 */
export interface PerGuestRate {
  price: number | null;
  description: string;
}

export interface PerPersonRatesResult {
  nights: number;
  totalPax: number;
  mainPax: number;      // Adults in main beds (double/twin rooms)
  extraBedPax: number;  // Extra bed pax count (actual beds, excludes CNB)
  cnbPax: number;       // CNB (Child No Bed) — complimentary, no transport seat
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
}

function matchOccupancyByKeywords(
  occupancyTypes: { id: string; name: string }[],
  keywordSets: string[][]
): { id: string; name: string } | null {
  for (const keywords of keywordSets) {
    const found = occupancyTypes.find((ot) => {
      const name = (ot.name || '').toLowerCase();
      return keywords.every((kw) => name.includes(kw));
    });
    if (found) return found;
  }
  return null;
}

function formatINR(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/**
 * Derive a per-guest rate sheet (per-person twin-sharing, per-couple, extra bed, child rates)
 * from an existing `PricingCalculationResult`.
 *
 * Formulas (confirmed with business):
 *   Per Person       = (DoubleRate ÷ 2) × nights  +   transportPerPerson
 *   Per Couple       =  DoubleRate      × nights  + 2×transportPerPerson
 *   Extra Bed        =  ExtraBedRate    × nights  +   transportPerPerson
 *   Child w/ Mattress=  ChildMatRate    × nights  +   transportPerPerson
 *   Child w/o Mat.   =  ChildNoMatRate  × nights  +   transportPerPerson
 *   Child <5 w/ Seat =  transportPerPerson
 *   Child <5 no Seat =  0
 *
 * `transportPerPerson = totalTransport ÷ totalPaxInAllocation` (adults + children + extra beds).
 *
 * If the hotel has no row on file for a required occupancy, the corresponding rate is returned
 * with `price = null` and a description explaining why.
 */
export async function derivePerPersonRates(params: {
  calculationResult: PricingCalculationResult;
  itineraries: PricingItinerary[];
  tourStartsFrom: Date | string;
  tourEndsOn: Date | string;
}): Promise<PerPersonRatesResult> {
  const { calculationResult, itineraries, tourStartsFrom, tourEndsOn } = params;

  const startDate = dateToUtc(tourStartsFrom) || new Date();
  const endDate = dateToUtc(tourEndsOn) || new Date();

  const occupancyTypes = await prismadb.occupancyType.findMany({
    where: { isActive: true },
    select: { id: true, name: true, maxPersons: true },
  });

  // Identify CNB (Child No Bed) occupancy types — complimentary, no transport seat
  const cnbOccIds = new Set(
    occupancyTypes
      .filter((o) => {
        const n = (o.name || '').toLowerCase();
        return (n.includes('no') && n.includes('bed')) || n.includes('cnb') || (n.includes('without') && n.includes('bed'));
      })
      .map((o) => o.id)
  );

  // Count mainPax (adults in main beds), extraBedPax (actual extra beds), cnbPax (complimentary no-bed)
  let mainPax = 0;
  let extraBedPax = 0;
  let cnbPax = 0;
  for (const it of itineraries) {
    let dayMainPax = 0;
    let dayExtraBedPax = 0;
    let dayCnbPax = 0;
    for (const room of it.roomAllocations || []) {
      const occ = occupancyTypes.find((o) => o.id === room.occupancyTypeId);
      const perRoom = occ?.maxPersons || 1;
      const qty = room.quantity || 0;
      dayMainPax += qty * perRoom;
      for (const eb of room.extraBeds || []) {
        const ebQty = eb.quantity && eb.quantity > 0 ? eb.quantity : 1;
        if (cnbOccIds.has(eb.occupancyTypeId)) {
          dayCnbPax += ebQty;
        } else {
          dayExtraBedPax += ebQty;
        }
      }
    }
    if (dayMainPax > mainPax) mainPax = dayMainPax;
    if (dayExtraBedPax > extraBedPax) extraBedPax = dayExtraBedPax;
    if (dayCnbPax > cnbPax) cnbPax = dayCnbPax;
  }
  mainPax = Math.max(mainPax, 1);
  // CNB children take transport seats but no separate room charge — absorbed into adult rate
  const totalPax = Math.max(mainPax + extraBedPax + cnbPax, mainPax);

  const markupPct = calculationResult.appliedMarkup?.percentage ?? 0;
  const markupFactor = 1 + markupPct / 100;

  const transportTotal = calculationResult.breakdown.transport || 0;
  const transportPerPerson = transportTotal / totalPax;

  // Aggregate per-occupancy TOTAL costs already priced in the breakdown (totalCost = pricePerNight × qty)
  const priced: Record<string, number> = {};
  for (const day of calculationResult.itineraryBreakdown) {
    for (const room of day.roomBreakdown) {
      priced[room.occupancyTypeId] = (priced[room.occupancyTypeId] || 0) + room.totalCost;
      for (const eb of room.extraBedCosts || []) {
        priced[eb.occupancyTypeId] = (priced[eb.occupancyTypeId] || 0) + eb.totalCost;
      }
    }
  }

  // Sum CNB room costs across all CNB occupancy type IDs
  const cnbTotal = Array.from(cnbOccIds).reduce((sum, id) => sum + (priced[id] || 0), 0);

  // Sum non-CNB extra bed accommodation costs from actual allocation (using same pricePerNight basis as priced dict)
  // mainOccIds: occupancy types used as the primary room allocation (not extra beds)
  const mainOccIds = new Set(
    itineraries.flatMap(it => (it.roomAllocations || []).map(ra => ra.occupancyTypeId).filter(Boolean))
  );
  const nonCnbExtraBedAccomTotal = Object.entries(priced)
    .filter(([id]) => !mainOccIds.has(id) && !cnbOccIds.has(id))
    .reduce((sum, [, cost]) => sum + cost, 0);
  // Total extra accommodation = CNB + any non-CNB extra beds in allocation
  const totalExtraAccom = cnbTotal + nonCnbExtraBedAccomTotal;
  const totalExtraPax = cnbPax + extraBedPax;

  // For days where we need a rate not in the allocation, fall back to HotelPricing
  const dayContexts = itineraries.map((it) => ({
    dayNumber: it.dayNumber,
    hotelId: it.hotelId,
    mealPlanId: it.roomAllocations?.[0]?.mealPlanId,
  }));

  async function nightlyTotalFor(occupancyId: string | null | undefined): Promise<number | null> {
    if (!occupancyId) return null;
    if (priced[occupancyId] !== undefined) return priced[occupancyId];

    let anyFound = false;
    let total = 0;
    for (const ctx of dayContexts) {
      if (!ctx.hotelId || !ctx.mealPlanId) continue;
      const pricing = await prismadb.hotelPricing.findFirst({
        where: {
          hotelId: ctx.hotelId,
          occupancyTypeId: occupancyId,
          mealPlanId: ctx.mealPlanId,
          isActive: true,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        orderBy: { startDate: 'desc' },
      });
      if (pricing) {
        anyFound = true;
        total += pricing.price;
      }
    }
    return anyFound ? total : null;
  }

  const doubleOcc = matchOccupancyByKeywords(occupancyTypes, [['double'], ['twin']]);
  const extraBedOcc = matchOccupancyByKeywords(occupancyTypes, [['extra', 'bed'], ['extra', 'mattress']]);
  const childWithMatOcc = matchOccupancyByKeywords(occupancyTypes, [['child', 'with', 'mattress']]);
  const childNoMatOcc = matchOccupancyByKeywords(occupancyTypes, [
    ['child', 'without', 'mattress'],
    ['child', 'w/o', 'mattress'],
    ['child', 'no', 'mattress'],
  ]);

  const [doubleTotal, extraBedTotal, childMatTotal, childNoMatTotal] = await Promise.all([
    nightlyTotalFor(doubleOcc?.id),
    nightlyTotalFor(extraBedOcc?.id),
    nightlyTotalFor(childWithMatOcc?.id),
    nightlyTotalFor(childNoMatOcc?.id),
  ]);

  const transportLine = transportTotal > 0
    ? `Transport:  Rs.${formatINR(transportTotal)} total ÷ ${totalPax} pax  =  Rs.${formatINR(transportPerPerson)}`
    : `Transport:  Rs.0 (no transport cost)`;

  const missingRate = (name: string): PerGuestRate => ({
    price: null,
    description: `No ${name} rate on file for this hotel / meal plan / date range.\nAdd a HotelPricing row or enter the rate manually.`,
  });

  const numRooms = mainPax / 2; // assuming double rooms (2 persons each)
  const markupLine = (base: number) =>
    markupPct > 0 ? `Markup (${markupPct}%):  Rs.${formatINR(base)} × ${markupFactor.toFixed(2)}  =  Rs.${formatINR(Math.round(base * markupFactor))}` : '';

  // Adults split only the main room cost — extra occupancy costs are priced separately
  const adultRoomTotal = doubleTotal ?? 0;

  const perPerson: PerGuestRate =
    doubleTotal === null
      ? missingRate('Double/Twin')
      : (() => {
          const share = adultRoomTotal / mainPax;
          const base = share + transportPerPerson;
          const price = base * markupFactor;
          const ml = markupLine(base);
          return {
            price: Math.round(price),
            description:
              `Room:       Rs.${formatINR(doubleTotal)} ÷ ${mainPax} adults  =  Rs.${formatINR(share)}\n` +
              `${transportLine}\n` +
              (ml ? `${ml}\n` : '') +
              `Per Person  =  Rs.${formatINR(Math.round(price))}`,
          };
        })();

  // Per couple = per person × 2 (same adults share 1 room; transport for 2)
  const perCouple: PerGuestRate =
    perPerson.price === null
      ? missingRate('Double/Twin')
      : (() => {
          const price = perPerson.price * 2;
          return {
            price,
            description:
              `Per Person:  Rs.${formatINR(perPerson.price)}\n` +
              `Per Couple  =  Rs.${formatINR(perPerson.price)} × 2  =  Rs.${formatINR(price)}`,
          };
        })();

  // Per extra-occupancy person = total extra accommodation (CNB + non-CNB extra beds) ÷ extra pax, with markup
  // Transport is NOT included here — the child's transport is shown in "Child below 5 With Seat"
  const perPersonWithExtraBed: PerGuestRate =
    totalExtraPax > 0 && totalExtraAccom > 0
      ? (() => {
          const perPaxAccom = totalExtraAccom / totalExtraPax;
          const price = perPaxAccom * markupFactor;
          const ml = markupLine(perPaxAccom);
          return {
            price: Math.round(price),
            description:
              `Extra Occ:  Rs.${formatINR(totalExtraAccom)} (${totalExtraPax} extra person${totalExtraPax > 1 ? 's' : ''}) ÷ ${totalExtraPax}  =  Rs.${formatINR(perPaxAccom)}/person\n` +
              (ml ? `${ml}\n` : '') +
              `Per Extra Person (room only)  =  Rs.${formatINR(Math.round(price))}`,
          };
        })()
      : missingRate('Extra Bed / Extra Mattress');

  const childWithMattress: PerGuestRate =
    childMatTotal === null
      ? missingRate('Child with Mattress')
      : (() => {
          const base = childMatTotal + transportPerPerson;
          const price = base * markupFactor;
          const ml = markupLine(base);
          return {
            price: Math.round(price),
            description:
              `Child rate: Rs.${formatINR(childMatTotal)} (with mattress)\n` +
              `${transportLine}\n` +
              (ml ? `${ml}\n` : '') +
              `Child (with Mattress)  =  Rs.${formatINR(Math.round(price))}`,
          };
        })();

  const childWithoutMattress: PerGuestRate =
    childNoMatTotal === null
      ? missingRate('Child without Mattress')
      : (() => {
          const base = childNoMatTotal + transportPerPerson;
          const price = base * markupFactor;
          const ml = markupLine(base);
          return {
            price: Math.round(price),
            description:
              `Child rate: Rs.${formatINR(childNoMatTotal)} (without mattress)\n` +
              `${transportLine}\n` +
              (ml ? `${ml}\n` : '') +
              `Child (without Mattress)  =  Rs.${formatINR(Math.round(price))}`,
          };
        })();

  // "Child below 5 With Seat" = CNB child: takes transport seat; room is charged separately via "Extra Occupancy".
  // Only populated when CNB children exist in the allocation — no hypothetical rates.
  const childBelow5WithSeat: PerGuestRate = cnbPax > 0
    ? (() => {
        const base = transportPerPerson;
        const price = base * markupFactor;
        const ml = markupLine(base);
        return {
          price: Math.round(price),
          description:
            `Transport seat (CNB shares parents' bed; room charged separately as Extra Occupancy)\n` +
            `${transportLine}\n` +
            (ml ? `${ml}\n` : '') +
            `Child below 5 (with seat)  =  Rs.${formatINR(Math.round(price))}`,
        };
      })()
    : { price: null, description: '' };

  // "Child below 5 Without Seat" = truly complimentary: no transport seat, no room charge.
  const childBelow5WithoutSeat: PerGuestRate = {
    price: 0,
    description: 'Complimentary — no transport seat, no room charge.',
  };

  const nights =
    Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    nights,
    totalPax,
    mainPax,
    extraBedPax,
    cnbPax,
    transportTotal,
    transportPerPerson,
    rates: {
      perPerson,
      perCouple,
      perPersonWithExtraBed,
      childWithMattress,
      childWithoutMattress,
      childBelow5WithSeat,
      childBelow5WithoutSeat,
    },
  };
}

/**
 * Format currency for display (Indian Rupees)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format currency with decimals
 */
export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
