import { NextResponse } from 'next/server';
import { calculatePricing } from '@/lib/pricing-calculator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/pricing/calculate
 * 
 * Calculate pricing for a tour package query based on itineraries, rooms, and transport.
 * This is the standard pricing calculation endpoint (non-variant).
 * 
 * @body tourStartsFrom - Tour start date
 * @body tourEndsOn - Tour end date
 * @body itineraries - Array of itinerary objects with roomAllocations and transportDetails
 * @body markup - Optional markup percentage (default 0)
 * 
 * @returns PricingCalculationResult with complete breakdown
 */
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

    console.log('🧮 [PRICING-CALCULATE] Starting calculation');
    console.log('📅 [PRICING-CALCULATE] Tour dates:', { tourStartsFrom, tourEndsOn });
    console.log('🗓️ [PRICING-CALCULATE] Itineraries:', itineraries.length);

    // Use the shared pricing calculator service
    const result = await calculatePricing({
      tourStartsFrom,
      tourEndsOn,
      itineraries,
      markup,
      includeNames: true // Include room type/occupancy/meal plan names for display
    });

    console.log('✅ [PRICING-CALCULATE] Calculation complete:', {
      totalCost: result.totalCost,
      basePrice: result.basePrice,
      markup: result.appliedMarkup
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ [PRICING-CALCULATE-ERROR]', error);
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
