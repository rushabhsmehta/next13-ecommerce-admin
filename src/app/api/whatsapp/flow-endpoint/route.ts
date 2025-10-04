import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import crypto from 'crypto';

/**
 * WhatsApp Flow Endpoint Handler
 * Receives encrypted data_exchange callbacks from Meta WhatsApp Flow Builder
 * Documentation: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsJSON
 * Encryption: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
 */

// Request format (encrypted) - as received from WhatsApp
interface EncryptedFlowRequest {
  encrypted_flow_data: string;  // Base64 encoded AES-encrypted JSON
  encrypted_aes_key: string;    // Base64 encoded RSA-encrypted AES key
  initial_vector: string;        // Base64 encoded AES IV
}

// Request format (decrypted) - after decryption
interface FlowDataExchangeRequest {
  version: string;
  action: 'INIT' | 'data_exchange' | 'BACK';
  screen?: string;
  data?: Record<string, any>;
  flow_token: string;
}

// Response format
interface FlowResponse {
  version: string;
  screen: string;
  data: Record<string, any>;
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

/**
 * Decrypt incoming WhatsApp Flow request
 * Uses RSA-OAEP to decrypt AES key, then AES-256-GCM to decrypt flow data
 */
function decryptRequest(encryptedRequest: EncryptedFlowRequest): FlowDataExchangeRequest {
  try {
    // Get private key from environment
    const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    if (!privateKeyPem) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY not configured in environment');
    }

    // Step 1: Decrypt AES key using RSA private key
    const encryptedAesKeyBuffer = Buffer.from(encryptedRequest.encrypted_aes_key, 'base64');
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedAesKeyBuffer as any
    );

    // Step 2: Decrypt flow data using AES-256-GCM
    const encryptedFlowDataBuffer = Buffer.from(encryptedRequest.encrypted_flow_data, 'base64');
    const initialVector = Buffer.from(encryptedRequest.initial_vector, 'base64');
    
    // Extract auth tag (last 16 bytes) and ciphertext
    const authTagLength = 16;
    const ciphertext = encryptedFlowDataBuffer.subarray(0, -authTagLength);
    const authTag = encryptedFlowDataBuffer.subarray(-authTagLength);

    // Create decipher and set auth tag
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey as any, initialVector as any);
    decipher.setAuthTag(authTag as any);

    // Decrypt
    const decryptedPart1 = decipher.update(ciphertext as any);
    const decryptedPart2 = decipher.final();
    const decrypted = Buffer.concat([decryptedPart1 as any, decryptedPart2 as any]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt request');
  }
}

/**
 * Encrypt outgoing WhatsApp Flow response
 * Uses the same AES key that was used to encrypt the request
 */
function encryptResponse(
  response: FlowResponse,
  encryptedRequest: EncryptedFlowRequest
): { encrypted_flow_data: string } {
  try {
    // Get private key from environment
    const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    if (!privateKeyPem) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY not configured in environment');
    }

    // Step 1: Decrypt AES key (same as in decryptRequest)
    const encryptedAesKeyBuffer = Buffer.from(encryptedRequest.encrypted_aes_key, 'base64');
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedAesKeyBuffer as any
    );

    // Step 2: Generate new IV for response
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM

    // Step 3: Encrypt response using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey as any, iv as any);
    const responseJson = JSON.stringify(response);
    
    const encryptedPart1 = cipher.update(responseJson, 'utf8');
    const encryptedPart2 = cipher.final();
    const encrypted = Buffer.concat([encryptedPart1 as any, encryptedPart2 as any]);
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data + auth tag
    const encryptedWithTag = Buffer.concat([encrypted as any, authTag as any]);

    // Return encrypted response (Base64 encoded)
    return {
      encrypted_flow_data: encryptedWithTag.toString('base64'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt response');
  }
}

export async function POST(req: NextRequest) {
  try {
    const encryptedBody: EncryptedFlowRequest = await req.json();

    // Validate encrypted request format
    if (!encryptedBody.encrypted_flow_data || !encryptedBody.encrypted_aes_key || !encryptedBody.initial_vector) {
      return NextResponse.json(
        { error: 'Invalid encrypted request format' },
        { status: 400 }
      );
    }

    // Decrypt the request
    const body = decryptRequest(encryptedBody);

    console.log('WhatsApp Flow Request (Decrypted):', {
      version: body.version,
      action: body.action,
      screen: body.screen,
      flow_token: body.flow_token,
    });

    // Handle different actions
    let response: FlowResponse;

    if (body.action === 'INIT') {
      // INIT action - return DESTINATION_SELECTOR screen
      response = {
        version: body.version,
        screen: 'DESTINATION_SELECTOR',
        data: {
          destinations: [
            { id: '0_vietnam', title: '🇻🇳 Vietnam' },
            { id: '1_thailand', title: '🇹🇭 Thailand' },
            { id: '2_bali', title: '🇮🇩 Bali, Indonesia' },
            { id: '3_singapore', title: '🇸🇬 Singapore' },
            { id: '4_malaysia', title: '🇲🇾 Malaysia' },
            { id: '5_dubai', title: '🇦🇪 Dubai, UAE' },
            { id: '6_maldives', title: '🇲🇻 Maldives' },
            { id: '7_europe', title: '🇪🇺 Europe' },
          ],
        },
      };
    } else if (body.action === 'data_exchange') {
      // data_exchange action - route based on current screen
      if (!body.screen) {
        return NextResponse.json(
          { error: 'Screen not specified in data_exchange action' },
          { status: 400 }
        );
      }

      switch (body.screen) {
        case 'DESTINATION_SELECTOR':
          response = await handleDestinationSelection(body);
          break;

        case 'TOUR_OPTIONS':
          response = await handleTourOptions(body);
          break;

        case 'PACKAGE_OFFERS':
          response = await handlePackageOffers(body);
          break;

        case 'PACKAGE_DETAIL':
          response = await handleBookingSubmission(body);
          break;

        default:
          return NextResponse.json(
            { error: `Unknown screen: ${body.screen}` },
            { status: 400 }
          );
      }
    } else if (body.action === 'BACK') {
      // BACK action - navigate to previous screen
      // For now, just return current screen (you can implement proper navigation)
      response = {
        version: body.version,
        screen: body.screen || 'DESTINATION_SELECTOR',
        data: {},
      };
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${body.action}` },
        { status: 400 }
      );
    }

    // Encrypt the response
    const encryptedResponse = encryptResponse(response, encryptedBody);

    console.log('WhatsApp Flow Response:', {
      screen: response.screen,
      encrypted: true,
    });

    return NextResponse.json(encryptedResponse);
  } catch (error) {
    console.error('WhatsApp Flow Endpoint Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle destination selection - returns tour options data
 */
async function handleDestinationSelection(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const { destination_selection } = (body.data || {}) as BookingData;

  // Extract destination from ID (format: "0_vietnam")
  const destination = destination_selection?.split('_')[1] || 'vietnam';

  // Return data for TOUR_OPTIONS screen
  return {
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
  };
}

/**
 * Handle tour options - returns personalized package offers
 */
async function handleTourOptions(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const {
    tour_types,
    duration,
    group_size,
    accommodation,
    travel_preferences,
    budget,
    selected_destination,
  } = (body.data || {}) as BookingData;

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

  return {
    version: body.version,
    screen: 'PACKAGE_OFFERS',
    data: {
      selected_destination: selected_destination || 'vietnam',
      offer_label: `Here are ${packages.length} shortlisted tour packages for you`,
      shortlisted_packages: packages,
    },
  };
}

/**
 * Handle package selection - returns package details
 */
async function handlePackageOffers(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const { package: packageId } = (body.data || {}) as BookingData;

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

  return {
    version: body.version,
    screen: 'PACKAGE_DETAIL',
    data: packageData,
  };
}

/**
 * Handle booking submission - save to database and return success
 */
async function handleBookingSubmission(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const bookingData = (body.data || {}) as BookingData;

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
    return {
      version: body.version,
      screen: 'SUCCESS',
      data: {
        confirmation_message: `Thank you! Your inquiry has been received. Our team will contact you shortly at ${bookingData.phone_number}.`,
      },
    };
  } catch (error) {
    console.error('Failed to save booking:', error);
    throw error; // Let the main POST handler catch this
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
