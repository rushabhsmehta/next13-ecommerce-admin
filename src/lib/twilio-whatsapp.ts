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
