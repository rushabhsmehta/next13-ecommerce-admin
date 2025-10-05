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
  action: 'INIT' | 'data_exchange' | 'BACK' | 'ping';
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
  // From PACKAGE_OFFERS form payload
  package?: string;  // e.g., "0_vietnam_adventure_7d"
  
  // From PACKAGE_DETAIL booking form payload (includes data.* values)
  package_id?: string;      // From data.selected_package
  package_name?: string;    // From data.package_name
  package_price?: string;   // From data.package_price
  customer_name?: string;
  phone_number?: string;
  email?: string;
  travelers_count?: string;
  travel_date?: string;
  special_requests?: string;
  
  // From DESTINATION_SELECTOR form payload
  destination_selection?: string;
  
  // From TOUR_OPTIONS form payload
  tour_types?: string[];  // CheckboxGroup returns array
  duration?: string;       // RadioButtonsGroup returns string
  group_size?: string;     // RadioButtonsGroup returns string
  accommodation?: string[]; // CheckboxGroup returns array
  travel_preferences?: string[]; // CheckboxGroup returns array
  budget?: string;         // RadioButtonsGroup returns string
  selected_destination?: string; // From data.selected_destination
}

/**
 * Decrypt incoming WhatsApp Flow request
 * Uses RSA-OAEP to decrypt AES key, then AES-128-GCM to decrypt flow data
 * Based on Meta's official example: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
 */
function decryptRequest(encryptedRequest: EncryptedFlowRequest): {
  decryptedBody: FlowDataExchangeRequest;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
} {
  try {
    // Get private key and passphrase from environment
    let privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE || '';
    
    if (!privateKeyPem) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY not configured in environment');
    }

    // Decode base64 if the key is base64-encoded (for Vercel compatibility)
    // Vercel doesn't support multi-line env vars, so we base64 encode them
    if (!privateKeyPem.includes('-----BEGIN')) {
      privateKeyPem = Buffer.from(privateKeyPem, 'base64').toString('utf-8');
    }

    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = encryptedRequest;

    // Step 1: Decrypt the AES key created by the client
    // Create private key with passphrase support (following Meta's official example)
    const privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      passphrase  // Support for encrypted private keys
    });

    // @ts-ignore - Buffer type compatibility
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encrypted_aes_key, 'base64') as any
    );

    // Step 2: Decrypt the Flow data
    const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
    const initialVectorBuffer = Buffer.from(initial_vector, 'base64');

    const TAG_LENGTH = 16;
    const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
    const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

    // Create decipher and set auth tag (using AES-128-GCM as per Meta's example)
    // @ts-ignore - Buffer type compatibility
    const decipher = crypto.createDecipheriv(
      'aes-128-gcm',
      decryptedAesKey as any,
      initialVectorBuffer as any
    );
    decipher.setAuthTag(encrypted_flow_data_tag as any);

    // @ts-ignore - Buffer.concat type compatibility
    const decryptedJSONString = Buffer.concat([
      decipher.update(encrypted_flow_data_body as any) as any,
      decipher.final() as any,
    ]).toString('utf-8');

    return {
      decryptedBody: JSON.parse(decryptedJSONString),
      aesKeyBuffer: decryptedAesKey,
      initialVectorBuffer,
    };
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt request');
  }
}

/**
 * Encrypt outgoing WhatsApp Flow response
 * Uses the same AES key and flipped IV as per Meta's official example
 * Reference: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
 */
function encryptResponse(
  response: FlowResponse,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string {
  try {
    // Flip the initialization vector (bitwise NOT operation)
    const flipped_iv: number[] = [];
    // @ts-ignore - Iterator compatibility
    for (let i = 0; i < initialVectorBuffer.length; i++) {
      flipped_iv.push(~initialVectorBuffer[i]);
    }

    // Encrypt the response data using AES-128-GCM with flipped IV
    // @ts-ignore - Buffer type compatibility
    const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer as any, Buffer.from(flipped_iv) as any);

    // @ts-ignore - Buffer.concat type compatibility
    return Buffer.concat([
      cipher.update(JSON.stringify(response), 'utf-8') as any,
      cipher.final() as any,
      cipher.getAuthTag() as any,
    ]).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt response');
  }
}

/**
 * Validate request signature using x-hub-signature-256 header
 */
function isRequestSignatureValid(body: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  
  if (!appSecret) {
    console.warn('META_APP_SECRET is not set. Skipping signature validation.');
    return true;
  }
  
  if (!signature) {
    console.error('Missing x-hub-signature-256 header');
    return false;
  }
  
  try {
    const signatureBuffer = Buffer.from(signature.replace('sha256=', ''), 'utf-8');
    const hmac = crypto.createHmac('sha256', appSecret);
    const digestString = hmac.update(body).digest('hex');
    const digestBuffer = Buffer.from(digestString, 'utf-8');
    
    // @ts-ignore - Buffer type compatibility
    if (!crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      console.error('Request signature did not match');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature validation
    const rawBody = await req.text();
    const encryptedBody: EncryptedFlowRequest = JSON.parse(rawBody);
    
    // Validate request signature
    const signature = req.headers.get('x-hub-signature-256');
    if (!isRequestSignatureValid(rawBody, signature)) {
      // Return 432 if signature validation fails
      return new NextResponse(null, { status: 432 });
    }

    // Validate encrypted request format
    if (!encryptedBody.encrypted_flow_data || !encryptedBody.encrypted_aes_key || !encryptedBody.initial_vector) {
      return new NextResponse(null, { status: 400 });
    }

    // Decrypt the request
    let decryptedBody: FlowDataExchangeRequest;
    let aesKeyBuffer: Buffer;
    let initialVectorBuffer: Buffer;
    
    try {
      const result = decryptRequest(encryptedBody);
      decryptedBody = result.decryptedBody;
      aesKeyBuffer = result.aesKeyBuffer;
      initialVectorBuffer = result.initialVectorBuffer;
    } catch (error) {
      console.error('Decryption failed:', error);
      // Return 421 to refresh public key on client
      return new NextResponse(null, { status: 421 });
    }

    console.log('WhatsApp Flow Request (Decrypted):', {
      version: decryptedBody.version,
      action: decryptedBody.action,
      screen: decryptedBody.screen,
      flow_token: decryptedBody.flow_token,
    });

    // Handle different actions
    console.log('💬 Decrypted Request:', decryptedBody);

    // Handle ping/health check
    if (decryptedBody.action === 'ping') {
      const pingResponse = { data: { status: 'active' } };
      const encryptedPing = encryptResponse(pingResponse as any, aesKeyBuffer, initialVectorBuffer);
      return new NextResponse(encryptedPing, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Handle error acknowledgment
    if (decryptedBody.data?.error) {
      console.warn('Received client error:', decryptedBody.data);
      const errorAck = { data: { acknowledged: true } };
      const encryptedAck = encryptResponse(errorAck as any, aesKeyBuffer, initialVectorBuffer);
      return new NextResponse(encryptedAck, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    let response: FlowResponse;

    if (decryptedBody.action === 'INIT') {
      // INIT action - return DESTINATION_SELECTOR screen
      response = {
        version: decryptedBody.version,
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
    } else if (decryptedBody.action === 'data_exchange') {
      // data_exchange action - route based on current screen
      if (!decryptedBody.screen) {
        return NextResponse.json(
          { error: 'Screen not specified in data_exchange action' },
          { status: 400 }
        );
      }

      switch (decryptedBody.screen) {
        case 'DESTINATION_SELECTOR':
          response = await handleDestinationSelection(decryptedBody);
          break;

        case 'TOUR_OPTIONS':
          response = await handleTourOptions(decryptedBody);
          break;

        case 'PACKAGE_OFFERS':
          response = await handlePackageOffers(decryptedBody);
          break;

        case 'PACKAGE_DETAIL':
          response = await handleBookingSubmission(decryptedBody);
          break;

        default:
          return NextResponse.json(
            { error: `Unknown screen: ${decryptedBody.screen}` },
            { status: 400 }
          );
      }
    } else if (decryptedBody.action === 'BACK') {
      // BACK action - navigate to previous screen
      // For now, just return current screen (you can implement proper navigation)
      response = {
        version: decryptedBody.version,
        screen: decryptedBody.screen || 'DESTINATION_SELECTOR',
        data: {},
      };
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${decryptedBody.action}` },
        { status: 400 }
      );
    }

    // Encrypt the response
    const encryptedResponse = encryptResponse(response, aesKeyBuffer, initialVectorBuffer);

    console.log('WhatsApp Flow Response:', {
      screen: response.screen,
      encrypted: true,
    });

    // Return as plaintext (base64 string) with CORS headers
    return new NextResponse(encryptedResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
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
      title: 'Vietnam Adventure - 7D/6N\n₹85,000 per person • 4★ Hotels',
    },
    {
      id: '1_vietnam_luxury_9d',
      title: 'Vietnam Luxury Tour - 9D/8N\n₹1,45,000 per person • 5★ Resorts',
    },
    {
      id: '2_vietnam_budget_5d',
      title: 'Vietnam Explorer - 5D/4N\n₹45,000 per person • 3★ Hotels',
    },
    {
      id: '3_vietnam_honeymoon_8d',
      title: 'Vietnam Honeymoon Special - 8D/7N\n₹1,10,000 per person • Luxury Resorts',
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
📦 Package: ${bookingData.package_name || 'N/A'}
💰 Price: ${bookingData.package_price || 'N/A'}
📧 Email: ${bookingData.email || 'Not provided'}
👥 Number of Travelers: ${bookingData.travelers_count || 'N/A'}
📅 Preferred Date: ${bookingData.travel_date || 'N/A'}
📝 Special Requests: ${bookingData.special_requests || 'None'}

🔖 Source: WhatsApp Flow
🆔 Package ID: ${bookingData.package_id || 'N/A'}
        `.trim(),
        tourPackageQueryType: 'INQUIRY',
        isFeatured: false,
        isArchived: false,
      },
    });

    console.log('✅ Booking saved to database:', booking.id);
    console.log('📋 Booking details:', {
      packageName: bookingData.package_name,
      customer: bookingData.customer_name,
      phone: bookingData.phone_number,
      travelers: bookingData.travelers_count,
    });

    // TODO: Send booking confirmation via WhatsApp template
    // TODO: Notify admin team via email/SMS

    // Return success response - navigate to SUCCESS screen
    return {
      version: body.version,
      screen: 'SUCCESS',
      data: {},  // SUCCESS screen has terminal: true and empty data
    };
  } catch (error) {
    console.error('❌ Failed to save booking:', error);
    throw error; // Let the main POST handler catch this
  }
}

/**
 * OPTIONS method for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
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
