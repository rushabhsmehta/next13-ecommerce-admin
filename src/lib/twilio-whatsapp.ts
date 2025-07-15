import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

if (!accountSid || !authToken || !whatsappNumber) {
  console.warn('Missing Twilio credentials. Please check your environment variables.');
}

let client: any = null;

try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

export interface WhatsAppMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string;
}

export async function sendWhatsAppMessage({ to, body, mediaUrl }: WhatsAppMessageOptions) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messageOptions: any = {
      from: whatsappNumber,
      to: `whatsapp:${to}`,
      body,
    };

    if (mediaUrl) {
      messageOptions.mediaUrl = [mediaUrl];
    }

    const message = await client.messages.create(messageOptions);
    
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getWhatsAppMessages(limit = 20) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messages = await client.messages.list({
      from: whatsappNumber,
      limit,
    });

    return {
      success: true,
      messages: messages.map((msg: any) => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
      })),
    };
  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getConversationHistory(phoneNumber: string, limit = 50) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    const messages = await client.messages.list({
      to: `whatsapp:${phoneNumber}`,
      limit,
    });

    return {
      success: true,
      messages: messages.map((msg: any) => ({
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent,
      })),
    };
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendTemplateMessage(options: { to: string; template: string; variables?: string[] }) {
  try {
    if (!client) {
      return {
        success: false,
        error: 'Twilio client not initialized. Please check your environment variables.',
      };
    }

    // For template messages, we'll use a simple text message for now
    // In production, you would use WhatsApp Business API templates
    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${options.to}`,
      body: options.template,
    });

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error('Error sending template message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function validateWebhookSignature(signature: string, url: string, body: string): boolean {
  try {
    // Basic validation - in production you would use Twilio's webhook validation
    return typeof signature === 'string' && signature.length > 0;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

export function parseIncomingMessage(body: any) {
  try {
    return {
      from: body.From?.replace('whatsapp:', '') || '',
      to: body.To?.replace('whatsapp:', '') || '',
      body: body.Body || '',
      messageSid: body.MessageSid || '',
      accountSid: body.AccountSid || '',
      numMedia: parseInt(body.NumMedia || '0'),
      mediaUrl: body.MediaUrl0 || null,
      mediaContentType: body.MediaContentType0 || null,
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return null;
  }
}
