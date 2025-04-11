import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
// Removed auth import as we're making this endpoint public for the auto-calculator
// import { auth } from '@clerk/nextjs';

export async function POST(req: Request) {
  try {
    // Removed authentication check to allow public access for pricing calculator
    // const { userId } = auth();
    // if (!userId) {
    //   return new NextResponse("Unauthorized", { status: 401 });
    // }

    // Parse request body
    const body = await req.json();
    const { 
      tourStartsFrom, 
      tourEndsOn, 
      itineraries,   
    } = body;

    // Validate required fields
    if (!tourStartsFrom || !tourEndsOn || !itineraries || !itineraries.length) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Convert string dates to Date objects if they're not already
    const startDate = new Date(tourStartsFrom);
    const endDate = new Date(tourEndsOn);
    
    // Calculate total duration in days
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both start and end days    // Define types for our result structure
    interface ItineraryResultItem {
      day: number;
      accommodationCost: number;
      transportCost: number;
      totalCost: number;
    }
    
    interface PriceBreakdown {
      accommodation: number;
      transport: number;
    }
    
    interface PerPersonCosts {
      adult: number;
      child5to12: number;
      child0to5: number;
    }
    
    interface PricingTiers {
      standardMarkup: number;
      premiumMarkup: number;
      luxuryMarkup: number;
    }
      interface TransportDetail {
      day: number;
      vehicleType: string;
      quantity: number;
      capacity?: string;
      pricePerUnit: number;
      pricingType: string; // "PerDay" or "PerTrip"
      totalCost: number;
    }

    interface PriceCalculationResult {
      totalCost: number;
      breakdown: PriceBreakdown;
      dailyBreakdown: any[];
      itineraryBreakdown: ItineraryResultItem[];
      transportDetails: TransportDetail[];
      perPersonCosts?: PerPersonCosts;
      pricingTiers?: PricingTiers;
    }
      // Initialize result data structure
    const result: PriceCalculationResult = {
      totalCost: 0,
      breakdown: {
        accommodation: 0,
        transport: 0,
      },
      dailyBreakdown: [],
      itineraryBreakdown: [],
      transportDetails: []
    };

    // Process each itinerary
    for (const itinerary of itineraries) {
      const { hotelId, locationId, dayNumber, roomAllocations, transportDetails } = itinerary;
      
      // Skip itineraries without hotel or location
      if (!hotelId || !locationId) continue;
      
      const itineraryResult = {
        day: dayNumber,
        accommodationCost: 0,
        transportCost: 0,
        totalCost: 0
      };      // Process8 room allocations - ENHANCED VERSION
      if (roomAllocations && roomAllocations.length) {
        for (const room of roomAllocations) {
          const { quantity, roomType, occupancyType, mealPlan } = room;
          
          // Skip if quantity is missing
          if (!quantity) continue;
          
          console.log(`Looking for pricing - Hotel: ${hotelId}, Room Type: ${roomType}, Occupancy: ${occupancyType}, Meal Plan: ${mealPlan}`);
          
          // First try for exact match with room type, occupancy and meal plan
          let pricing = null;
          
          if (roomType && occupancyType && mealPlan) {
            // Try with all criteria
            pricing = await prismadb.hotelPricing.findFirst({
              where: {
                hotelId,
                roomType: { equals: roomType},
                occupancyType: { equals: occupancyType },
                mealPlan: { equals: mealPlan },
                isActive: true,
                startDate: { lte: endDate },
                endDate: { gte: startDate }
              },
              orderBy: {
                startDate: 'desc'  // Get the most recent applicable pricing
              }
            });
          }
          
          // Don't try any fallbacks - we want exact matches only
          // If no exact match was found, pricing will remain null
          
          if (pricing) {
            const roomCost = pricing.price * parseInt(quantity.toString());
            itineraryResult.accommodationCost += roomCost;
            console.log(`Found pricing for hotel ${hotelId} (${pricing.roomType}/${pricing.occupancyType}): ${pricing.price} x ${quantity} = ${roomCost}`);
          } else {
            // When no matching pricing is found, set roomCost to 0 but don't throw an error
            const roomCost = 0;
            console.log(`No pricing found for hotel ${hotelId} with configuration: ${roomType}/${occupancyType}/${mealPlan} - using zero price`);
            // Still increment by zero to maintain proper structure
            itineraryResult.accommodationCost += roomCost;
          }
        }
      }
      
      // Process transport details - NEW SECTION FOR TRANSPORT MATCHING
      if (transportDetails && transportDetails.length > 0) {
        console.log(`Processing transport details for day ${dayNumber}`);
        
        // Process each vehicle in transportDetails array
        for (const transport of transportDetails) {
          const { vehicleType, quantity = 1 } = transport;
          
          if (!vehicleType) continue;
          
          console.log(`Looking for transport pricing - Location: ${locationId}, Vehicle Type: ${vehicleType}`);
          
          // Find matching transport pricing
          const transportPricing = await prismadb.transportPricing.findFirst({
            where: {
              locationId,
              vehicleType: { equals: vehicleType },
              isActive: true,
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            },
            orderBy: {
              startDate: 'desc'  // Get the most recent applicable pricing
            }
          });
            if (transportPricing) {
            let vehicleCost = 0;
            
            // Calculate cost based on transport type (per day or per trip)
            if (transportPricing.transportType === "PerDay") {
              vehicleCost = transportPricing.price * quantity;
              console.log(`Found per-day transport pricing: ${transportPricing.vehicleType} - ${transportPricing.price} x ${quantity} = ${vehicleCost}`);
            } else {
              // For "PerTrip" type, charge once for the entire trip
              vehicleCost = transportPricing.price * quantity;
              console.log(`Found per-trip transport pricing: ${transportPricing.vehicleType} - ${transportPricing.price} x ${quantity} = ${vehicleCost}`);
            }
            
            // Add to transport cost for this itinerary
            itineraryResult.transportCost += vehicleCost;
            
            // Add detailed transport information to the result
            result.transportDetails.push({
              day: dayNumber,
              vehicleType: transportPricing.vehicleType,
              quantity: quantity,
              pricePerUnit: transportPricing.price,
              pricingType: transportPricing.transportType,
              totalCost: vehicleCost
            });
          } else {
            console.log(`No transport pricing found for location ${locationId} with vehicle type: ${vehicleType} - using zero price`);
          }
        }
      }
      
      // Calculate total cost for this itinerary - now including transport costs
      itineraryResult.totalCost = itineraryResult.accommodationCost + itineraryResult.transportCost;
      
      // Add to overall totals - including transport costs now
      result.breakdown.accommodation += itineraryResult.accommodationCost;
      result.breakdown.transport += itineraryResult.transportCost;
      result.totalCost += itineraryResult.totalCost;

      // Add to itinerary breakdown
      result.itineraryBreakdown.push(itineraryResult);
    }    // Per-person cost calculation removed as requested
    // Markup tier calculation removed as requested

    return NextResponse.json(result);
    
  } catch (error) {
    console.log('[PACKAGE_PRICING_CALCULATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
