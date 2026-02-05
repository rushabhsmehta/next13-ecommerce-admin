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
 * Room allocation for pricing calculation
 */
export interface RoomAllocation {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  quantity: number;
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

    // Calculate accommodation costs
    if (hotelId && roomAllocations && roomAllocations.length > 0) {
      for (const room of roomAllocations) {
        const { quantity, roomTypeId, occupancyTypeId, mealPlanId } = room;

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
            totalCost: roomCost
          };

          // Add names if requested
          if (includeNames) {
            roomCostDetail.roomTypeName = roomTypes.find(rt => rt.id === roomTypeId)?.name;
            roomCostDetail.occupancyTypeName = occupancyTypes.find(ot => ot.id === occupancyTypeId)?.name;
            roomCostDetail.mealPlanName = mealPlans.find(mp => mp.id === mealPlanId)?.name;
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
  const pricingItineraries: PricingItinerary[] = itineraries.map((itinerary: any) => {
    const itineraryId = itinerary.id || `day-${itinerary.dayNumber}`;
    
    return {
      locationId: itinerary.locationId,
      dayNumber: itinerary.dayNumber,
      hotelId: itinerary.hotelId,
      roomAllocations: variantRooms[itineraryId] || [],
      transportDetails: variantTransport[itineraryId] || []
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
