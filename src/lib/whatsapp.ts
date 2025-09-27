import prisma from './prismadb';

const AISENSY_API_BASE = process.env.AISENSY_API_BASE || 'https://backend.aisensy.com';
const AISENSY_ENDPOINT = `${AISENSY_API_BASE.replace(/\/$/, '')}/campaign/t1/api/v2`;

export interface SendWhatsAppMessageParams {
  to: string; // E.164
  message?: string;
  saveToDb?: boolean;
  campaignName?: string;
  userName?: string;
  source?: string;
  templateParams?: string[];
  tags?: string[];
  attributes?: Record<string, string>;
  media?: { url: string; filename?: string };
  location?: {
    latitude: string;
    longitude: string;
    name: string;
    address: string;
  };
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string; // Provider message id / reference
  error?: string;
  dbRecord?: any;
  provider?: 'aisensy';
  rawResponse?: any;
}

function resolveDefaultCampaign() {
  return process.env.AISENSY_DEFAULT_CAMPAIGN_NAME || process.env.AISENSY_DEFAULT_CAMPAIGN;
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

function mergeTags(requestTags?: string[]) {
  const envTags = (process.env.AISENSY_DEFAULT_TAGS || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  const all = [...(requestTags || []), ...envTags];
  return Array.from(new Set(all));
}

function sanitizeAttributes(attributes?: Record<string, string>) {
  if (!attributes) return undefined;
  const entries = Object.entries(attributes).filter(([, value]) => typeof value === 'string' && value.length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function sanitizeTemplateParams(params?: string[], message?: string) {
  if (params && params.length) return params.map(p => String(p));
  if (message) return [message];
  return undefined;
}

function buildDbMessageBody(params: SendWhatsAppMessageParams, campaign: string) {
  if (params.message) return params.message;
  if (params.templateParams?.length) {
    const rendered = params.templateParams.join(' | ');
    return `Template ${campaign} :: ${rendered}`;
  }
  return `[AiSensy campaign: ${campaign}]`;
}

async function sendViaAiSensy(params: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  const {
    to,
    message,
    saveToDb = true,
    campaignName,
    userName,
    source,
    templateParams,
    tags,
    attributes,
    media,
    location,
  } = params;

  if (!process.env.AISENSY_API_KEY) {
    throw new Error('Missing AiSensy API key');
  }

  const resolvedCampaign = campaignName || resolveDefaultCampaign();
  if (!resolvedCampaign) {
    throw new Error('Missing AiSensy campaign name');
  }

  const destination = normalizeE164(to);
  const payload: Record<string, any> = {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName: resolvedCampaign,
    destination,
  };

  const resolvedUserName = userName || process.env.AISENSY_DEFAULT_USERNAME;
  if (resolvedUserName) payload.userName = resolvedUserName;

  const resolvedSource = source || process.env.AISENSY_DEFAULT_SOURCE;
  if (resolvedSource) payload.source = resolvedSource;

  const resolvedTemplateParams = sanitizeTemplateParams(templateParams, message);
  if (resolvedTemplateParams) payload.templateParams = resolvedTemplateParams;

  const mergedTags = mergeTags(tags);
  if (mergedTags.length) payload.tags = mergedTags;

  const sanitizedAttributes = sanitizeAttributes(attributes);
  if (sanitizedAttributes) payload.attributes = sanitizedAttributes;

  if (media?.url) {
    payload.media = {
      url: media.url,
      ...(media.filename ? { filename: media.filename } : {}),
    };
  }

  if (location && location.latitude && location.longitude && location.name && location.address) {
    payload.location = location;
  }

  const res = await fetch(AISENSY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch (err) {
    // AiSensy sometimes responds with empty body on errors
    data = null;
  }

  if (!res.ok || (data && data.status && String(data.status).toLowerCase() === 'error')) {
    const errorMessage = data?.error || data?.message || `AiSensy request failed (${res.status})`;
    throw new Error(errorMessage);
  }

  const messageId = data?.data?.messageId || data?.data?.id || data?.requestId || data?.messageId || data?.id;
  const dbBody = buildDbMessageBody({ ...params, message }, resolvedCampaign);

  let dbRecord;
  if (saveToDb) {
    try {
      dbRecord = await prisma.whatsAppMessage.create({
        data: {
          to: `whatsapp:${destination}`,
          from: `whatsapp:${process.env.AISENSY_SENDER_ID || 'AiSensy'}`,
          message: dbBody,
          messageSid: messageId || undefined,
          status: 'sent',
          direction: 'outbound',
          sentAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Error saving AiSensy message to DB:', err);
    }
  }

  return { success: true, messageSid: messageId, dbRecord, provider: 'aisensy', rawResponse: data };
}

export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  try {
    return await sendViaAiSensy(params);
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    let dbRecord;
    if (params.saveToDb !== false) {
      try {
        const to = normalizeE164(params.to || '');
        dbRecord = await prisma.whatsAppMessage.create({
          data: {
            to: to ? `whatsapp:${to}` : params.to,
            from: `whatsapp:${process.env.AISENSY_SENDER_ID || ''}`,
            message: params.message || (params.templateParams?.length ? params.templateParams.join(' | ') : '[send failed]'),
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
  buttonParams?: Array<Array<string>>;
  campaignName?: string;
  saveToDb?: boolean;
  userName?: string;
  source?: string;
  tags?: string[];
  attributes?: Record<string, string>;
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<WhatsAppMessageResponse> {
  const {
    to,
    templateName,
    languageCode = 'en_US',
    bodyParams = [],
    buttonParams = [],
    campaignName,
    saveToDb,
    userName,
    source,
    tags,
    attributes,
  } = params;

  const renderedParams = bodyParams.map(v => String(v));
  const preview = renderedParams.length ? `Template ${templateName} :: ${renderedParams.join(' | ')}` : `[template:${templateName}]`;
  return sendWhatsAppMessage({
    to,
    message: preview,
    saveToDb,
    campaignName: campaignName || templateName,
    templateParams: renderedParams,
    userName,
    source,
    tags,
    attributes,
  });
}
