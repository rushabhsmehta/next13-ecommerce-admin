import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface IncomingMessage {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  profileName?: string;
  whatsappId?: string;
  numMedia: number;
  mediaUrls: string[];
  mediaContentTypes: string[];
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  locationAddress?: string;
  buttonText?: string;
  timestamp: Date;
}

export interface MediaAttachment {
  url: string;
  contentType: string;
}

export interface SendMessageOptions {
  to: string;
  body?: string;
  mediaUrl?: string;
  templateSid?: string;
  contentSid?: string;
  contentVars?: Record<string, string>;
}

/**
 * Parse incoming WhatsApp message from Twilio webhook
 * Based on the comprehensive guide for handling all WhatsApp content types
 */
export function parseIncomingMessage(params: { [key: string]: string }): IncomingMessage | null {
  try {
    const from = params.From;
    const to = params.To;
    const body = params.Body || '';
    const messageSid = params.MessageSid;
    
    if (!from || !to || !messageSid) {
      console.error('Missing required fields:', { from, to, messageSid });
      return null;
    }

    // Parse media attachments
    const numMedia = parseInt(params.NumMedia || '0', 10);
    const mediaUrls: string[] = [];
    const mediaContentTypes: string[] = [];
    
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = params[`MediaUrl${i}`];
      const contentType = params[`MediaContentType${i}`];
      if (mediaUrl && contentType) {
        mediaUrls.push(mediaUrl);
        mediaContentTypes.push(contentType);
      }
    }

    // Parse location data
    const latitude = params.Latitude ? parseFloat(params.Latitude) : undefined;
    const longitude = params.Longitude ? parseFloat(params.Longitude) : undefined;
    const locationLabel = params.Label || undefined;
    const locationAddress = params.Address || undefined;

    // Parse WhatsApp-specific fields
    const profileName = params.ProfileName || undefined;
    const whatsappId = params.WaId || undefined;
    
    // Parse interactive message response (button clicks)
    const buttonText = params.ButtonText || undefined;

    return {
      messageSid,
      from,
      to,
      body,
      profileName,
      whatsappId,
      numMedia,
      mediaUrls,
      mediaContentTypes,
      latitude,
      longitude,
      locationLabel,
      locationAddress,
      buttonText,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return null;
  }
}

/**
 * Validate Twilio webhook signature for security
 */
export function validateWebhookSignature(
  signature: string,
  url: string,
  body: string
): boolean {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('TWILIO_AUTH_TOKEN not configured');
      return false;
    }

    // Parse the body as URL-encoded form data for Twilio validation
    const params: Record<string, any> = {};
    const formData = new URLSearchParams(body);
    formData.forEach((value, key) => {
      params[key] = value;
    });

    return twilio.validateRequest(authToken, signature, url, params);
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(options: SendMessageOptions) {
  console.log('🚀 === TWILIO HELPER START ===');
  console.log('📋 Input options:', options);
  
  try {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    console.log('📞 From number:', fromNumber);
    
    if (!fromNumber) {
      console.error('❌ TWILIO_WHATSAPP_NUMBER not configured');
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured');
    }

    const messageOptions: any = {
      from: fromNumber,
      to: options.to
    };
    
    console.log('🎯 Initial message options:', messageOptions);

    // Handle template messages vs regular messages
    if (options.contentSid) {
      console.log('📄 Processing template message');
      console.log('  - contentSid:', options.contentSid);
      console.log('  - contentVars:', options.contentVars);
      
      messageOptions.contentSid = options.contentSid;
      // Only add contentVariables if they exist and are not empty
      if (options.contentVars && Object.keys(options.contentVars).length > 0) {
        const jsonString = JSON.stringify(options.contentVars);
        messageOptions.contentVariables = jsonString;
        console.log('✅ Added contentVariables JSON:', jsonString);
      } else {
        console.log('⚠️ No contentVars provided or empty object');
      }
    } else if (options.templateSid) {
      console.log('📄 Processing legacy template with templateSid');
      messageOptions.messagingServiceSid = options.templateSid;
      if (options.body) {
        messageOptions.body = options.body;
        console.log('✅ Added body:', options.body);
      }
    } else {
      console.log('📝 Processing regular message');
      // Regular message
      if (options.body) {
        messageOptions.body = options.body;
        console.log('✅ Added body:', options.body);
      }
      if (options.mediaUrl) {
        messageOptions.mediaUrl = [options.mediaUrl];
        console.log('✅ Added media URL:', options.mediaUrl);
      }
    }

    console.log('📤 Final Twilio message options:', {
      from: messageOptions.from,
      to: messageOptions.to,
      hasContentSid: !!messageOptions.contentSid,
      contentVariables: messageOptions.contentVariables ? 'Present' : 'None',
      hasBody: !!messageOptions.body,
      hasMediaUrl: !!messageOptions.mediaUrl,
      hasMessagingServiceSid: !!messageOptions.messagingServiceSid
    });
    
    console.log('🌐 Making Twilio API call...');
    const message = await client.messages.create(messageOptions);
    
    console.log('✅ Twilio API response received:');
    console.log('  - SID:', message.sid);
    console.log('  - Status:', message.status);
    console.log('  - To:', message.to);
    console.log('  - From:', message.from);
    console.log('  - Body:', message.body);
    console.log('  - Date Created:', message.dateCreated);
    console.log('  - Price:', message.price);
    console.log('  - Price Unit:', message.priceUnit);
    console.log('🏁 === TWILIO HELPER SUCCESS ===');
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      sid: message.sid,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      price: message.price,
      priceUnit: message.priceUnit
    };
  } catch (error) {
    console.error('💥 === TWILIO HELPER ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Full error object:', error);
    
    // Enhanced error logging for Twilio errors
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('🔥 Twilio API Error Details:');
      console.error('  - Status:', (error as any).status);
      console.error('  - Code:', (error as any).code);
      console.error('  - Message:', (error as any).message);
      console.error('  - More Info:', (error as any).moreInfo);
      console.error('  - Details:', (error as any).details);
    }
    
    if (error instanceof Error) {
      console.error('📋 Standard Error Details:');
      console.error('  - Message:', error.message);
      console.error('  - Stack:', error.stack);
    }
    
    // Check for specific Twilio error patterns
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('21211')) {
      console.error('🚫 Twilio Error 21211: Invalid To number detected');
    } else if (errorMessage.includes('21408')) {
      console.error('🚫 Twilio Error 21408: Permission denied for sending to number');
    } else if (errorMessage.includes('21606')) {
      console.error('🚫 Twilio Error 21606: From number not authorized for WhatsApp');
    } else if (errorMessage.includes('content')) {
      console.error('📄 Content-related error detected');
    }
    
    console.error('🏁 === TWILIO HELPER ERROR END ===');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download media from Twilio
 */
export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  try {
    // Twilio media URLs require authentication
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

/**
 * Create auto-reply based on message content
 * Implements the logic patterns from the guide
 */
export function createAutoReply(message: IncomingMessage): string | null {
  const body = message.body.toLowerCase().trim();
  
  // Text message responses
  if (body) {
    if (body === 'hello' || body === 'hi' || body.includes('hello') || body.includes('hi')) {
      return `Hello, ${message.profileName || 'there'}! How can we assist you today?`;
    }
    
    if (body.includes('help') || body.includes('support')) {
      return 'Thanks for reaching out! Our team will contact you shortly. You can also call us for immediate assistance.';
    }
    
    if (body.includes('hours') || body.includes('timing') || body.includes('open')) {
      return 'We are open 9am-6pm Monday-Friday, and 10am-4pm on weekends. How can we help you today?';
    }
    
    if (body.includes('price') || body.includes('cost') || body.includes('rate')) {
      return 'Thank you for your interest in our services! Our team will send you detailed pricing information shortly.';
    }
    
    // Button/interactive response
    if (message.buttonText) {
      return `Thank you for selecting "${message.buttonText}". We'll process your request and get back to you.`;
    }
    
    // Default text response
    return 'Thank you for your message. We have received it and will respond soon.';
  }
  
  // Media message responses
  if (message.numMedia > 0) {
    const firstType = message.mediaContentTypes[0] || '';
    
    if (firstType.startsWith('image/')) {
      if (firstType === 'image/webp') {
        return '🎉 Nice sticker! We have received your image.';
      }
      return '🖼️ Thank you for the image! We have received it and will review it.';
    }
    
    if (firstType.startsWith('video/')) {
      return '📹 Thanks for the video! We have received it.';
    }
    
    if (firstType.startsWith('audio/')) {
      return '🎵 Received your audio message! We will listen to it and respond.';
    }
    
    if (firstType.includes('vcard') || firstType.includes('contact')) {
      return '📞 Thanks for the contact card. We\'ve received it.';
    }
    
    if (firstType.includes('pdf') || firstType.includes('document')) {
      return '📄 Thank you for the document! We have received it and will review it.';
    }
    
    return 'We have received your attachment. Thank you!';
  }
  
  // Location message response
  if (message.latitude && message.longitude) {
    return `📍 Location received! (${message.latitude.toFixed(6)}, ${message.longitude.toFixed(6)}) ${message.locationLabel ? `- ${message.locationLabel}` : ''}. Thank you for sharing your location.`;
  }
  
  return null;
}

/**
 * Check if user is within 24-hour session window
 */
export function isWithin24HourWindow(lastMessageTime: Date): boolean {
  const now = new Date();
  const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastMessage <= 24;
}

/**
 * Get message type for classification
 */
export function getMessageType(message: IncomingMessage): string {
  if (message.buttonText) return 'interactive_button';
  if (message.latitude && message.longitude) return 'location';
  if (message.numMedia > 0) {
    const firstType = message.mediaContentTypes[0] || '';
    if (firstType.startsWith('image/')) return 'image';
    if (firstType.startsWith('video/')) return 'video';
    if (firstType.startsWith('audio/')) return 'audio';
    if (firstType.includes('vcard')) return 'contact';
    return 'media';
  }
  if (message.body) return 'text';
  return 'unknown';
}
