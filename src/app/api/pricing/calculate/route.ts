import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

interface RoomCostDetail {
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string | undefined;
  quantity: number;
  pricePerNight: number;
  totalCost: number;
}

interface ItineraryResult {
  day: number;
  accommodationCost: number;
  transportCost: number;
  totalCost: number;
  roomBreakdown?: RoomCostDetail[]; // Renamed from roomCostDetails
}

interface TransportDetail {
  day: number;
  vehicleType: string;
  quantity: number;
  pricePerUnit: number;
  pricingType: string;
  totalCost: number;
}

interface PricingResult {
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
  dailyBreakdown: any[];
  itineraryBreakdown: ItineraryResult[];
  transportDetails: TransportDetail[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      tourStartsFrom, 
      tourEndsOn, 
      itineraries,
      markup = 0,
    } = body;

    if (!tourStartsFrom || !tourEndsOn || !itineraries || !itineraries.length) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const startDate = new Date(tourStartsFrom);
    const endDate = new Date(tourEndsOn);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;

    const result: PricingResult = {
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
      dailyBreakdown: [],
      itineraryBreakdown: [],
      transportDetails: []
    };

    for (const itinerary of itineraries) {
      const { hotelId, locationId, dayNumber, roomAllocations, transportDetails } = itinerary;

      if (!hotelId || !locationId) continue;

      const itineraryResult: ItineraryResult = {
        day: dayNumber,
        accommodationCost: 0,
        transportCost: 0,
        totalCost: 0
      };

      if (roomAllocations && roomAllocations.length) {
        for (const room of roomAllocations) {
          const { quantity, roomTypeId, occupancyTypeId, mealPlanId } = room;

          if (!quantity) continue;

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
          });          if (pricing) {
            const roomCost = pricing.price * quantity;
            
            // Store the detailed room pricing information for the frontend
            if (!itineraryResult.roomBreakdown) { // Use renamed property
              itineraryResult.roomBreakdown = []; // Use renamed property
            }
            
            itineraryResult.roomBreakdown.push({ // Use renamed property
              roomTypeId,
              occupancyTypeId,
              mealPlanId,
              quantity,
              pricePerNight: pricing.price, // Store price per night
              totalCost: roomCost // Store total cost for this allocation
            });
            
            itineraryResult.accommodationCost += roomCost;
          }
        }
      }

      if (transportDetails && transportDetails.length > 0) {
        for (const transport of transportDetails) {
          const { vehicleTypeId, quantity = 1 } = transport;

          if (!vehicleTypeId) continue;

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

            if (transportPricing.transportType === "PerDay") {
              vehicleCost = transportPricing.price * quantity;
            } else {
              vehicleCost = transportPricing.price * quantity;
            }

            itineraryResult.transportCost += vehicleCost;

            result.transportDetails.push({
              day: dayNumber,
              vehicleType: transportPricing.vehicleType.name,
              quantity: quantity,
              pricePerUnit: transportPricing.price,
              pricingType: transportPricing.transportType,
              totalCost: vehicleCost
            });
          }
        }
      }

      itineraryResult.totalCost = itineraryResult.accommodationCost + itineraryResult.transportCost;
      result.breakdown.accommodation += itineraryResult.accommodationCost;
      result.breakdown.transport += itineraryResult.transportCost;
      result.totalCost += itineraryResult.totalCost;
      result.itineraryBreakdown.push(itineraryResult);
    }

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

    return NextResponse.json(result);

  } catch (error) {
    console.log('[PACKAGE_PRICING_CALCULATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
