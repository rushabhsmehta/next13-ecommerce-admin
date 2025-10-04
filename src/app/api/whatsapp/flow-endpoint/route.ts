import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

/**
 * WhatsApp Flow Endpoint Handler
 * Receives data_exchange callbacks from Meta WhatsApp Flow Builder
 * Documentation: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsJSON
 */

interface FlowDataExchangeRequest {
  version: string;
  action: string;
  screen: string;
  data: Record<string, any>;
  flow_token: string;
}

interface BookingData {
  package_id?: string;
  package_name?: string;
  package_price?: string;
  customer_name?: string;
  phone_number?: string;
  email?: string;
  travelers_count?: string;
  travel_date?: string;
  special_requests?: string;
  destination_selection?: string;
  tour_types?: string[];
  duration?: string;
  group_size?: string;
  accommodation?: string[];
  travel_preferences?: string[];
  budget?: string;
  selected_destination?: string;
  package?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: FlowDataExchangeRequest = await req.json();

    console.log('WhatsApp Flow Request:', {
      version: body.version,
      action: body.action,
      screen: body.screen,
      data: body.data,
    });

    // Validate request
    if (!body.action || !body.screen) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Handle different screens
    switch (body.screen) {
      case 'DESTINATION_SELECTOR':
        return handleDestinationSelection(body);
      
      case 'TOUR_OPTIONS':
        return handleTourOptions(body);
      
      case 'PACKAGE_OFFERS':
        return handlePackageOffers(body);
      
      case 'PACKAGE_DETAIL':
        return handleBookingSubmission(body);
      
      default:
        return NextResponse.json(
          { error: 'Unknown screen' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('WhatsApp Flow Endpoint Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle destination selection - returns tour options data
 */
async function handleDestinationSelection(body: FlowDataExchangeRequest) {
  const { destination_selection } = body.data as BookingData;

  // Extract destination from ID (format: "0_vietnam")
  const destination = destination_selection?.split('_')[1] || 'vietnam';

  // Return data for TOUR_OPTIONS screen
  return NextResponse.json({
    version: body.version,
    screen: 'TOUR_OPTIONS',
    data: {
      selected_destination: destination,
      cta_label: 'View Tour Packages',
      screen_heading: `Let's find the perfect ${destination} tour package for you`,
      show_travel_type: true,
      tour_types: [
        { id: '0_honeymoon', title: 'Honeymoon Package' },
        { id: '1_family', title: 'Family Package' },
        { id: '2_adventure', title: 'Adventure Package' },
        { id: '3_luxury', title: 'Luxury Package' },
        { id: '4_budget', title: 'Budget Package' },
      ],
      duration_options: [
        { id: '0_3_5_days', title: '3-5 Days' },
        { id: '1_6_8_days', title: '6-8 Days' },
        { id: '2_9_12_days', title: '9-12 Days' },
        { id: '3_above_12_days', title: 'Above 12 Days' },
      ],
      accommodation_preferences: [
        { id: '0_3_star', title: '3 Star Hotels' },
        { id: '1_4_star', title: '4 Star Hotels' },
        { id: '2_5_star', title: '5 Star Hotels' },
        { id: '3_luxury_resorts', title: 'Luxury Resorts' },
      ],
      travel_preferences: [
        { id: '0_sightseeing', title: 'Sightseeing' },
        { id: '1_adventure_sports', title: 'Adventure Sports' },
        { id: '2_cultural_tours', title: 'Cultural Tours' },
        { id: '3_beach_relaxation', title: 'Beach & Relaxation' },
        { id: '4_local_cuisine', title: 'Local Cuisine Tours' },
      ],
      budget_range: [
        { id: '0_under_50k', title: 'Under ₹50,000 per person' },
        { id: '1_50k_1lakh', title: '₹50,000 - ₹1,00,000' },
        { id: '2_1lakh_2lakh', title: '₹1,00,000 - ₹2,00,000' },
        { id: '3_above_2lakh', title: 'Above ₹2,00,000' },
      ],
      group_size: [
        { id: '0_couple', title: 'Couple (2 people)' },
        { id: '1_small_family', title: 'Small Family (3-4 people)' },
        { id: '2_large_family', title: 'Large Family (5-8 people)' },
        { id: '3_group', title: 'Group (9+ people)' },
      ],
    },
  });
}

/**
 * Handle tour options - returns personalized package offers
 */
async function handleTourOptions(body: FlowDataExchangeRequest) {
  const {
    tour_types,
    duration,
    group_size,
    accommodation,
    travel_preferences,
    budget,
    selected_destination,
  } = body.data as BookingData;

  // TODO: Query actual packages from database based on preferences
  // For now, return mock data
  const packages = [
    {
      id: '0_vietnam_adventure_7d',
      title: 'Vietnam Adventure - 7D/6N',
      subtitle: '₹85,000 per person • 4★ Hotels',
    },
    {
      id: '1_vietnam_luxury_9d',
      title: 'Vietnam Luxury Tour - 9D/8N',
      subtitle: '₹1,45,000 per person • 5★ Resorts',
    },
    {
      id: '2_vietnam_budget_5d',
      title: 'Vietnam Explorer - 5D/4N',
      subtitle: '₹45,000 per person • 3★ Hotels',
    },
    {
      id: '3_vietnam_honeymoon_8d',
      title: 'Vietnam Honeymoon Special - 8D/7N',
      subtitle: '₹1,10,000 per person • Luxury Resorts',
    },
  ];

  return NextResponse.json({
    version: body.version,
    screen: 'PACKAGE_OFFERS',
    data: {
      selected_destination: selected_destination || 'vietnam',
      offer_label: `Here are ${packages.length} shortlisted tour packages for you`,
      shortlisted_packages: packages,
    },
  });
}

/**
 * Handle package selection - returns package details
 */
async function handlePackageOffers(body: FlowDataExchangeRequest) {
  const { package: packageId } = body.data as BookingData;

  // TODO: Query actual package details from database
  // For now, return mock data
  const packageData = {
    selected_package: packageId || '0_vietnam_adventure_7d',
    image_src: 'https://example.com/vietnam-package.jpg',
    package_name: 'Vietnam Adventure - 7D/6N',
    package_price: '₹85,000',
    package_duration: '7 Days / 6 Nights',
    package_highlights: [
      '✈️ Round-trip flights included',
      '🏨 4-star hotel accommodations',
      '🍽️ Daily breakfast & 3 dinners',
      '🚌 All transfers & sightseeing',
      '🎫 Entry tickets to attractions',
      '👨‍✈️ Professional tour guide',
    ],
    itinerary_summary:
      'Day 1: Arrival in Hanoi\nDay 2: Hanoi City Tour\nDay 3: Ha Long Bay Cruise\nDay 4: Transfer to Hoi An\nDay 5: Hoi An Ancient Town\nDay 6: My Son Sanctuary\nDay 7: Departure',
    inclusions:
      '✅ Visa assistance\n✅ Travel insurance\n✅ Airport transfers\n✅ All sightseeing\n✅ Guide services',
    exclusions:
      '❌ Lunch & personal expenses\n❌ Tips & gratuities\n❌ Optional activities',
  };

  return NextResponse.json({
    version: body.version,
    screen: 'PACKAGE_DETAIL',
    data: packageData,
  });
}

/**
 * Handle booking submission - save to database and return success
 */
async function handleBookingSubmission(body: FlowDataExchangeRequest) {
  const bookingData = body.data as BookingData;

  try {
    // Get a default location (required field)
    // TODO: Map destination to actual location in database
    const defaultLocation = await prismadb.location.findFirst();
    
    if (!defaultLocation) {
      throw new Error('No location found in database. Please create a location first.');
    }

    // Calculate tour dates
    const travelDate = bookingData.travel_date
      ? new Date(bookingData.travel_date)
      : new Date();
    
    // Save booking to database (TourPackageQuery table)
    const booking = await prismadb.tourPackageQuery.create({
      data: {
        tourPackageQueryName: bookingData.package_name || 'WhatsApp Flow Inquiry',
        customerName: bookingData.customer_name || 'Unknown',
        customerNumber: bookingData.phone_number || '',
        locationId: defaultLocation.id,
        tourStartsFrom: travelDate,
        numAdults: bookingData.travelers_count || '1',
        remarks: `
Email: ${bookingData.email || 'Not provided'}
Package: ${bookingData.package_name || 'N/A'}
Price: ${bookingData.package_price || 'N/A'}
Special Requests: ${bookingData.special_requests || 'None'}
Source: WhatsApp Flow
Preferences:
- Tour Types: ${bookingData.tour_types?.join(', ') || 'N/A'}
- Duration: ${bookingData.duration || 'N/A'}
- Group Size: ${bookingData.group_size || 'N/A'}
- Accommodation: ${bookingData.accommodation?.join(', ') || 'N/A'}
- Budget: ${bookingData.budget || 'N/A'}
        `.trim(),
        tourPackageQueryType: 'INQUIRY',
        isFeatured: false,
        isArchived: false,
      },
    });

    console.log('Booking saved to database:', booking.id);

    // TODO: Send booking confirmation via WhatsApp template
    // TODO: Notify admin team via email/SMS

    // Return success response - navigate to SUCCESS screen
    return NextResponse.json({
      version: body.version,
      screen: 'SUCCESS',
      data: {}, // SUCCESS screen doesn't need dynamic data
    });
  } catch (error) {
    console.error('Failed to save booking:', error);

    // Return error response
    return NextResponse.json(
      {
        error: 'Failed to save booking. Please try again or contact us directly.',
      },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET method for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'WhatsApp Flow Endpoint',
    timestamp: new Date().toISOString(),
  });
}
