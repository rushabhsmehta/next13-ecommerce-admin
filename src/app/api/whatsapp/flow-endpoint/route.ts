import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import crypto from 'crypto';

const DESTINATION_OPTIONS = [
  {
    id: 'bali',
    title: 'Bali, Indonesia',
    description: 'Tropical paradise with beaches and culture',
  },
  {
    id: 'paris',
    title: 'Paris, France',
    description: 'City of lights and romance',
  },
  {
    id: 'tokyo',
    title: 'Tokyo, Japan',
    description: 'Modern metropolis with ancient traditions',
  },
  {
    id: 'dubai',
    title: 'Dubai, UAE',
    description: 'Luxury and adventure in the desert',
  },
];

const PACKAGE_TYPES = [
  {
    id: 'luxury',
    title: 'Luxury Package',
    description: '5-star hotels, private tours, premium experiences',
  },
  {
    id: 'standard',
    title: 'Standard Package',
    description: '4-star hotels, guided tours, comfortable travel',
  },
  {
    id: 'budget',
    title: 'Budget Package',
    description: '3-star hotels, basic tours, economical options',
  },
];

const ACCOMMODATION_OPTIONS = [
  { id: 'city_center', title: 'City Center Hotel' },
  { id: 'beachfront', title: 'Beachfront Resort' },
  { id: 'mountain_view', title: 'Mountain View Lodge' },
];

const ACTIVITY_OPTIONS = [
  { id: 'scuba_diving', title: 'Scuba Diving Course', description: '$150', price: '$150' },
  { id: 'cooking_class', title: 'Local Cooking Class', description: '$75', price: '$75' },
  { id: 'safari', title: 'Safari Adventure', description: '$200', price: '$200' },
];

const PACKAGE_PRICE_MAP: Record<string, string> = {
  luxury: '$2,850',
  standard: '$1,950',
  budget: '$1,250',
};

type SessionState = {
  destinationId?: string;
  destinationTitle?: string;
  departureDate?: string;
  returnDate?: string;
  adultCount?: string;
  childCount?: string;
  packageTypeId?: string;
  packageTypeTitle?: string;
  accommodationId?: string;
  accommodationTitle?: string;
  activities?: string[];
  activitiesTitles?: string[];
};

const flowSessions = new Map<string, SessionState>();

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
  selected_destination?: string;
  departure_date?: string;
  return_date?: string;
  adult_count?: string;
  child_count?: string;
  selected_package?: string;
  selected_accommodation?: string;
  selected_activities?: string[];
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
    
    console.log('[DECRYPT] Key found:', !!privateKeyPem, 'Length:', privateKeyPem?.length, 'Has BEGIN:', privateKeyPem?.includes('-----BEGIN'));
    
    if (!privateKeyPem) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY not configured in environment');
    }

    // Decode base64 if the key is base64-encoded (for Vercel compatibility)
    // Vercel doesn't support multi-line env vars, so we base64 encode them
    const isBase64 = !privateKeyPem.includes('-----BEGIN');
    console.log('[DECRYPT] Is base64:', isBase64);
    if (isBase64) {
      privateKeyPem = Buffer.from(privateKeyPem, 'base64').toString('utf-8');
      console.log('[DECRYPT] Decoded to length:', privateKeyPem.length, 'Has newlines:', privateKeyPem.includes('\n'));
    }

    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = encryptedRequest;

    console.log('[DECRYPT] Received data:', {
      aes_key_length: encrypted_aes_key.length,
      flow_data_length: encrypted_flow_data.length,
      iv_length: initial_vector.length
    });

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

    console.log('[DECRYPT] AES key decrypted, length:', decryptedAesKey.length);

    // Step 2: Decrypt the Flow data
    const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
    const initialVectorBuffer = Buffer.from(initial_vector, 'base64');

    // NOTE: For incoming requests from WhatsApp, we use the ORIGINAL IV (not flipped)
    // We only flip the IV when encrypting our RESPONSE back to WhatsApp
    
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
    } catch (error: any) {
      console.error('Decryption failed:', error);
      // Return error details in development for debugging
      return NextResponse.json(
        { error: 'Decryption failed', message: error.message, keyFound: !!process.env.WHATSAPP_FLOW_PRIVATE_KEY },
        { status: 421 }
      );
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
      console.log('[FLOW] Ping request received');
      const pingResponse = { data: { status: 'active' } };
      const encryptedPing = encryptResponse(pingResponse as any, aesKeyBuffer, initialVectorBuffer);
      console.log('[FLOW] Ping response dispatched');
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

    console.log('[FLOW] Action routing decision', {
      action: decryptedBody.action,
      screen: decryptedBody.screen,
      flowToken: decryptedBody.flow_token,
    });

    let response: FlowResponse;

    if (decryptedBody.action === 'INIT') {
      console.log('[FLOW] INIT request received', {
        flowToken: decryptedBody.flow_token,
        version: decryptedBody.version,
      });
      flowSessions.set(decryptedBody.flow_token, {});
      response = {
        version: decryptedBody.version,
        screen: 'DESTINATION_SELECTION',
        data: {
          destinations: DESTINATION_OPTIONS,
        },
      };
      console.log('[FLOW] INIT response prepared', {
        nextScreen: response.screen,
        destinationsCount: DESTINATION_OPTIONS.length,
      });
    } else if (decryptedBody.action === 'data_exchange') {
      console.log('[FLOW] data_exchange received', {
        screen: decryptedBody.screen,
        flowToken: decryptedBody.flow_token,
      });
      // data_exchange action - route based on current screen
      if (!decryptedBody.screen) {
        return NextResponse.json(
          { error: 'Screen not specified in data_exchange action' },
          { status: 400 }
        );
      }

      switch (decryptedBody.screen) {
        case 'DESTINATION_SELECTION':
          console.log('[FLOW] Handling DESTINATION_SELECTION submission');
          response = await handleDestinationSelection(decryptedBody);
          break;

        case 'TRAVEL_DATES':
          console.log('[FLOW] Handling TRAVEL_DATES submission');
          response = await handleTravelDates(decryptedBody);
          break;

        case 'TRAVELERS':
          console.log('[FLOW] Handling TRAVELERS submission');
          response = await handleTravelers(decryptedBody);
          break;

        case 'PACKAGE_TYPE':
          console.log('[FLOW] Handling PACKAGE_TYPE submission');
          response = await handlePackageType(decryptedBody);
          break;

        case 'ACCOMMODATION':
          console.log('[FLOW] Handling ACCOMMODATION submission');
          response = await handleAccommodation(decryptedBody);
          break;

        case 'ACTIVITIES':
          console.log('[FLOW] Handling ACTIVITIES submission');
          response = await handleActivities(decryptedBody);
          break;

        case 'PACKAGE_SUMMARY':
          console.log('[FLOW] Handling PACKAGE_SUMMARY confirmation');
          response = await handlePackageSummary(decryptedBody);
          break;

        default:
          return NextResponse.json(
            { error: `Unknown screen: ${decryptedBody.screen}` },
            { status: 400 }
          );
      }

      console.log('[FLOW] Next screen prepared', {
        currentScreen: decryptedBody.screen,
        nextScreen: response.screen,
      });
    } else if (decryptedBody.action === 'BACK') {
      // BACK action - navigate to previous screen
      // For now, just return current screen (you can implement proper navigation)
      response = {
        version: decryptedBody.version,
        screen: decryptedBody.screen || 'DESTINATION_SELECTION',
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

async function handleDestinationSelection(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { selected_destination } = (body.data || {}) as BookingData;

  const destination = DESTINATION_OPTIONS.find((option) => option.id === selected_destination) || DESTINATION_OPTIONS[0];

  session.destinationId = destination.id;
  session.destinationTitle = destination.title;

  return {
    version: body.version,
    screen: 'TRAVEL_DATES',
    data: {
      departure_date: '',
      return_date: '',
    },
  };
}

async function handleTravelDates(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { departure_date = '', return_date = '' } = (body.data || {}) as BookingData;

  session.departureDate = departure_date;
  session.returnDate = return_date;

  return {
    version: body.version,
    screen: 'TRAVELERS',
    data: {
      adult_count: '',
      child_count: '',
    },
  };
}

async function handleTravelers(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { adult_count = '1', child_count = '0' } = (body.data || {}) as BookingData;

  session.adultCount = adult_count;
  session.childCount = child_count;

  return {
    version: body.version,
    screen: 'PACKAGE_TYPE',
    data: {
      package_types: PACKAGE_TYPES,
    },
  };
}

async function handlePackageType(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { selected_package } = (body.data || {}) as BookingData;

  const packageType = PACKAGE_TYPES.find((option) => option.id === selected_package) || PACKAGE_TYPES[0];

  session.packageTypeId = packageType.id;
  session.packageTypeTitle = packageType.title;

  return {
    version: body.version,
    screen: 'ACCOMMODATION',
    data: {
      accommodation_options: ACCOMMODATION_OPTIONS,
    },
  };
}

async function handleAccommodation(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { selected_accommodation } = (body.data || {}) as BookingData;

  const accommodation =
    ACCOMMODATION_OPTIONS.find((option) => option.id === selected_accommodation) || ACCOMMODATION_OPTIONS[0];

  session.accommodationId = accommodation.id;
  session.accommodationTitle = accommodation.title;

  return {
    version: body.version,
    screen: 'ACTIVITIES',
    data: {
      activities: ACTIVITY_OPTIONS,
    },
  };
}

async function handleActivities(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);
  const { selected_activities = [] } = (body.data || {}) as BookingData;

  const selected = ACTIVITY_OPTIONS.filter((option) => selected_activities.includes(option.id));

  session.activities = selected_activities;
  session.activitiesTitles = selected.length ? selected.map((item) => item.title) : ['No add-on activities'];

  return {
    version: body.version,
    screen: 'PACKAGE_SUMMARY',
    data: {
      summary: buildSummaryData(session),
    },
  };
}

async function handlePackageSummary(body: FlowDataExchangeRequest): Promise<FlowResponse> {
  const session = getSession(body.flow_token);

  const bookingId = await persistBooking(body.flow_token, session);

  return {
    version: body.version,
    screen: 'BOOKING_CONFIRMATION',
    data: {
      confirmation: {
        booking_id: bookingId,
        status: 'confirmed',
      },
    },
  };
}

function getSession(flowToken: string): SessionState {
  let session = flowSessions.get(flowToken);
  if (!session) {
    session = {};
    flowSessions.set(flowToken, session);
  }
  return session;
}

function buildSummaryData(session: SessionState) {
  const dates = session.departureDate && session.returnDate
    ? `${session.departureDate} to ${session.returnDate}`
    : session.departureDate || 'Flexible Dates';

  const travelers = session.childCount && session.childCount !== '0'
    ? `${session.adultCount || '0'} Adults, ${session.childCount} Children`
    : `${session.adultCount || '0'} Adults`;

  const totalPrice = session.packageTypeId
    ? PACKAGE_PRICE_MAP[session.packageTypeId] || 'Quote on request'
    : 'Quote on request';

  return {
    destination: session.destinationTitle || 'To be decided',
    dates,
    travelers,
    package_type: session.packageTypeTitle || 'To be decided',
    accommodation: session.accommodationTitle || 'To be decided',
    activities: (session.activitiesTitles && session.activitiesTitles.length
      ? session.activitiesTitles.join(', ')
      : 'No add-on activities'),
    total_price: totalPrice,
  };
}

async function persistBooking(flowToken: string, session: SessionState): Promise<string> {
  try {
    const location = await prismadb.location.findFirst();

    if (!location) {
      throw new Error('No location found in database. Please create a location first.');
    }

    const generatedName = `${session.destinationTitle || 'Tour'} Inquiry`;
    const tourStartsFrom = session.departureDate ? new Date(session.departureDate) : new Date();

    const record = await prismadb.tourPackageQuery.create({
      data: {
        tourPackageQueryName: generatedName,
        customerName: 'WhatsApp Flow Lead',
        customerNumber: '',
        locationId: location.id,
        tourStartsFrom,
        numAdults: session.adultCount || '1',
        remarks: [
          `Destination: ${session.destinationTitle || 'Not provided'}`,
          `Dates: ${session.departureDate || 'N/A'} to ${session.returnDate || 'N/A'}`,
          `Travelers: ${session.adultCount || '0'} adults${session.childCount && session.childCount !== '0' ? `, ${session.childCount} children` : ''}`,
          `Package Type: ${session.packageTypeTitle || 'Not selected'}`,
          `Accommodation: ${session.accommodationTitle || 'Not selected'}`,
          `Activities: ${(session.activitiesTitles && session.activitiesTitles.join(', ')) || 'None'}`,
          '',
          'Source: WhatsApp Flow',
          `Flow Token: ${flowToken}`,
        ].join('\n'),
        tourPackageQueryType: 'INQUIRY',
        isFeatured: false,
        isArchived: false,
      },
    });

    flowSessions.delete(flowToken);
    return record.id;
  } catch (error) {
    console.error('Failed to persist booking', error);
    flowSessions.delete(flowToken);
    const fallbackId = `TP-${Date.now().toString().slice(-6)}`;
    return fallbackId;
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
