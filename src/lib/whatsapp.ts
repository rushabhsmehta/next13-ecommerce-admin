import prisma from './prismadb';

// Meta WhatsApp Cloud API Configuration
const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const META_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}`;

// Optional: For production token refresh and webhook verification
const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

export interface SendWhatsAppMessageParams {
  to: string; // E.164 format phone number
  message?: string;
  saveToDb?: boolean;
  media?: { url: string; filename?: string };
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string; // Provider message id / reference
  error?: string;
  dbRecord?: any;
  provider?: 'meta';
  rawResponse?: any;
}

function normalizeE164(input: string) {
  if (!input) return input;
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return trimmed;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

async function sendViaMeta(params: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  const { to, message, saveToDb = true, media } = params;

  if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Missing Meta WhatsApp credentials. Please set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID');
  }

  const destination = normalizeE164(to);
  
  // Build payload for Meta WhatsApp Cloud API
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    to: destination,
  };

  if (media?.url) {
    // Send media message
    payload.type = 'image';
    payload.image = {
      link: media.url,
      ...(media.filename && { caption: media.filename }),
    };
  } else if (message) {
    // Send text message
    payload.type = 'text';
    payload.text = {
      preview_url: false,
      body: message,
    };
  } else {
    throw new Error('Either message or media must be provided');
  }

  const res = await fetch(`${META_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Failed to parse Meta API response');
  }

  if (!res.ok || data?.error) {
    const errorMessage = data?.error?.message || data?.error?.error_data?.details || `Meta API request failed (${res.status})`;
    throw new Error(errorMessage);
  }

  const messageId = data?.messages?.[0]?.id || data?.id;

  let dbRecord;
  if (saveToDb) {
    try {
      dbRecord = await prisma.whatsAppMessage.create({
        data: {
          to: `whatsapp:${destination}`,
          from: `whatsapp:${META_WHATSAPP_PHONE_NUMBER_ID}`,
          message: message || (media?.url ? `[Media: ${media.url}]` : '[Message sent]'),
          messageSid: messageId || undefined,
          status: 'sent',
          direction: 'outbound',
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Error saving Meta message to DB:', err);
    }
  }

  return { success: true, messageSid: messageId, dbRecord, provider: 'meta', rawResponse: data };
}

export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  try {
    return await sendViaMeta(params);
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    let dbRecord;
    if (params.saveToDb !== false) {
      try {
        const to = normalizeE164(params.to || '');
        dbRecord = await prisma.whatsAppMessage.create({
          data: {
            to: to ? `whatsapp:${to}` : params.to,
            from: `whatsapp:${META_WHATSAPP_PHONE_NUMBER_ID || ''}`,
            message: params.message || (params.media?.url ? `[Media: ${params.media.url}]` : '[send failed]'),
            status: 'failed',
            direction: 'outbound',
            errorMessage: error?.message || 'Unknown error',
          },
        });
      } catch (dbError) {
        console.error('Error saving failed message to DB:', dbError);
      }
    }
    return { success: false, error: error?.message || 'Unknown error', dbRecord };
  }
}


export async function getWhatsAppMessages(limit: number = 50) {
  try {
    return await prisma.whatsAppMessage.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    return [];
  }
}

export async function updateMessageStatus(messageSid: string, status: string) {
  try {
    return await prisma.whatsAppMessage.updateMany({
      where: { messageSid },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
      },
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    return null;
  }
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string; // e.g., en_US
  bodyParams?: Array<string | number>;
  buttonParams?: Array<any>; // Meta WhatsApp button components (flexible structure)
  saveToDb?: boolean;
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<WhatsAppMessageResponse> {
  const {
    to,
    templateName,
    languageCode = 'en_US',
    bodyParams = [],
    buttonParams = [],
    saveToDb = true,
  } = params;

  if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Missing Meta WhatsApp credentials');
  }

  const destination = normalizeE164(to);

  // Build Meta template message payload
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    to: destination,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  // Add components if we have parameters
  const components: any[] = [];

  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((value) => ({
        type: 'text',
        text: String(value),
      })),
    });
  }

  if (buttonParams.length > 0) {
    buttonParams.forEach((button) => {
      components.push(button);
    });
  }

  if (components.length > 0) {
    payload.template.components = components;
  }

  const res = await fetch(`${META_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error('Failed to parse Meta API response');
  }

  if (!res.ok || data?.error) {
    const errorMessage = data?.error?.message || data?.error?.error_data?.details || `Meta API request failed (${res.status})`;
    throw new Error(errorMessage);
  }

  const messageId = data?.messages?.[0]?.id || data?.id;
  const preview = bodyParams.length ? `Template ${templateName} :: ${bodyParams.join(' | ')}` : `[template:${templateName}]`;

  let dbRecord;
  if (saveToDb) {
    try {
      dbRecord = await prisma.whatsAppMessage.create({
        data: {
          to: `whatsapp:${destination}`,
          from: `whatsapp:${META_WHATSAPP_PHONE_NUMBER_ID}`,
          message: preview,
          messageSid: messageId || undefined,
          status: 'sent',
          direction: 'outbound',
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Error saving template message to DB:', err);
    }
  }

  return { success: true, messageSid: messageId, dbRecord, provider: 'meta', rawResponse: data };
}

// =============================================================================
// OPTIONAL: Production Utilities (App ID & Secret required)
// =============================================================================

/**
 * Exchange a short-lived token for a long-lived token (60 days)
 * Requires META_APP_ID and META_APP_SECRET
 */
export async function exchangeTokenForLongLived(shortLivedToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!META_APP_ID || !META_APP_SECRET) {
    console.error('META_APP_ID and META_APP_SECRET are required for token exchange');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`;
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (data.access_token) {
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in || 5184000, // 60 days in seconds
      };
    }

    console.error('Token exchange failed:', data);
    return null;
  } catch (error) {
    console.error('Error exchanging token:', error);
    return null;
  }
}

/**
 * Verify webhook signature from Meta
 * Requires META_WEBHOOK_VERIFY_TOKEN
 */
export function verifyWebhookSignature(mode: string, token: string, challenge: string): string | null {
  if (!META_WEBHOOK_VERIFY_TOKEN) {
    console.error('META_WEBHOOK_VERIFY_TOKEN is required for webhook verification');
    return null;
  }

  if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
    return challenge;
  }

  return null;
}

/**
 * Debug: Get current configuration status
 */
export function getMetaConfigStatus() {
  return {
    hasPhoneNumberId: !!META_WHATSAPP_PHONE_NUMBER_ID,
    hasAccessToken: !!META_WHATSAPP_ACCESS_TOKEN,
    hasAppId: !!META_APP_ID,
    hasAppSecret: !!META_APP_SECRET,
    hasWebhookToken: !!META_WEBHOOK_VERIFY_TOKEN,
    apiVersion: META_GRAPH_API_VERSION,
    isFullyConfigured: !!(META_WHATSAPP_PHONE_NUMBER_ID && META_WHATSAPP_ACCESS_TOKEN),
    hasProductionAuth: !!(META_APP_ID && META_APP_SECRET),
  };
}
