import prisma from './prismadb';

const CLOUD_API_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v19.0';

export interface SendWhatsAppMessageParams {
  to: string; // E.164
  message: string;
  saveToDb?: boolean;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string; // Cloud API message id
  error?: string;
  dbRecord?: any;
}

function cloudApiUrl(path: string) {
  return `https://graph.facebook.com/${CLOUD_API_VERSION}/${path}`;
}

export async function sendWhatsAppMessage({ to, message, saveToDb = true }: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  try {
    if (!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || !process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
      throw new Error('Missing WhatsApp Cloud API configuration');
    }
    const url = cloudApiUrl(`${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`);
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message, preview_url: false },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
    const messageId = data?.messages?.[0]?.id || data?.message_id;
    let dbRecord;
    if (saveToDb) {
      dbRecord = await prisma.whatsAppMessage.create({
        data: {
          to: `whatsapp:${to}`,
          from: `whatsapp:${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}`,
          message,
          messageSid: messageId,
          status: 'sent',
          direction: 'outbound',
          sentAt: new Date(),
        },
      });
    }
    return { success: true, messageSid: messageId, dbRecord };
  } catch (error: any) {
    console.error('Error sending WhatsApp (Cloud API) message:', error);
    let dbRecord;
    if (saveToDb) {
      try {
        dbRecord = await prisma.whatsAppMessage.create({
          data: {
            to: `whatsapp:${to}`,
            from: `whatsapp:${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || ''}`,
            message,
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
}

export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<WhatsAppMessageResponse> {
  const { to, templateName, languageCode = 'en_US', bodyParams = [], buttonParams = [] } = params;
  try {
    if (!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || !process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
      throw new Error('Missing WhatsApp Cloud API configuration');
    }
    const url = cloudApiUrl(`${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`);
    const components: any[] = [];
    if (bodyParams.length > 0) {
      components.push({ type: 'body', parameters: bodyParams.map(v => ({ type: 'text', text: String(v) })) });
    }
    if (buttonParams.length > 0) {
      buttonParams.forEach((params, idx) => {
        components.push({ type: 'button', sub_type: 'url', index: String(idx), parameters: params.map(v => ({ type: 'text', text: String(v) })) });
      });
    }
    const payload: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, ...(components.length ? { components } : {}) },
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
    const messageId = data?.messages?.[0]?.id || data?.message_id;
    let dbRecord;
    try {
      dbRecord = await prisma.whatsAppMessage.create({
        data: { to: `whatsapp:${to}`, from: `whatsapp:${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}`, message: `[template:${templateName}]`, messageSid: messageId, status: 'sent', direction: 'outbound', sentAt: new Date() },
      });
    } catch {}
    return { success: true, messageSid: messageId, dbRecord };
  } catch (error: any) {
    console.error('Error sending WhatsApp template (Cloud API):', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
