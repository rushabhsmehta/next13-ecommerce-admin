// filepath: src/app/api/pricing/calculate-variant/route.ts
import { NextResponse } from 'next/server';
import { calculateVariantPricing, derivePerPersonRates } from '@/lib/pricing-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pricing/calculate-variant
 * 
 * Calculate pricing for a specific tour package variant.
 * Extracts variant-specific room allocations and transport details.
 * 
 * @body variantId - The variant ID to calculate pricing for
 * @body variantRoomAllocations - JSON structure with variant room data
 * @body variantTransportDetails - JSON structure with variant transport data
 * @body itineraries - Array of itinerary objects
 * @body tourStartsFrom - Tour start date
 * @body tourEndsOn - Tour end date
 * @body markup - Optional markup percentage (default 0)
 * 
 * @returns PricingCalculationResult with complete breakdown
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      variantId,
      variantRoomAllocations,
      variantTransportDetails,
      itineraries,
      tourStartsFrom,
      tourEndsOn,
      markup = 0,
      includeBreakdown = false,
    } = body;

    // Validation
    if (!variantId) {
      return new NextResponse("Missing variantId", { status: 400 });
    }

    if (!tourStartsFrom || !tourEndsOn) {
      return new NextResponse("Missing tour start or end date", { status: 400 });
    }

    if (!itineraries || !Array.isArray(itineraries) || itineraries.length === 0) {
      return new NextResponse("Missing or invalid itineraries", { status: 400 });
    }

    console.log('🧮 [VARIANT-PRICING] Calculating for variant:', variantId);
    console.log('📅 [VARIANT-PRICING] Tour dates:', { tourStartsFrom, tourEndsOn });
    console.log('🗓️ [VARIANT-PRICING] Itinerary days:', itineraries.length);

    // Calculate variant pricing
    const result = await calculateVariantPricing({
      variantId,
      variantRoomAllocations,
      variantTransportDetails,
      itineraries,
      tourStartsFrom,
      tourEndsOn,
      markup,
    });

    console.log('✅ [VARIANT-PRICING] Calculation complete:', {
      totalCost: result.totalCost,
      basePrice: result.basePrice,
      markup: result.appliedMarkup
    });

    let perPersonRates = undefined;
    if (includeBreakdown) {
      const pricingItineraries = itineraries.map((it: any) => ({
        locationId: it.locationId,
        dayNumber: it.dayNumber,
        hotelId: it.hotelId,
        roomAllocations: it.roomAllocations || [],
        transportDetails: it.transportDetails || [],
      }));
      perPersonRates = await derivePerPersonRates({
        calculationResult: result,
        itineraries: pricingItineraries,
        tourStartsFrom,
        tourEndsOn,
      });
    }

    return NextResponse.json({ ...result, perPersonRates });

  } catch (error: any) {
    console.error('❌ [VARIANT-PRICING-ERROR]', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: error?.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
