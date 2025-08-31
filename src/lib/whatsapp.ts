import twilio from 'twilio';
import prisma from './prismadb';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export interface SendWhatsAppMessageParams {
  to: string; // Phone number with country code (e.g., +1234567890)
  message: string;
  saveToDb?: boolean;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  dbRecord?: any;
}

export async function sendWhatsAppMessage({
  to,
  message,
  saveToDb = true
}: SendWhatsAppMessageParams): Promise<WhatsAppMessageResponse> {
  try {
    // Validate environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('Missing Twilio configuration');
    }

    // Format the recipient number (ensure it starts with whatsapp:)
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = process.env.TWILIO_WHATSAPP_NUMBER!;

    // Ensure the from number also has the whatsapp: prefix
    const properlyFormattedFrom = formattedFrom.startsWith('whatsapp:') ? formattedFrom : `whatsapp:${formattedFrom}`;

    console.log('Sending WhatsApp message:', {
      from: properlyFormattedFrom,
      to: formattedTo,
      message: message.substring(0, 50) + '...'
    });

    // Send the message via Twilio
    const twilioMessage = await client.messages.create({
      from: properlyFormattedFrom,
      to: formattedTo,
      body: message,
    });

    let dbRecord;
    if (saveToDb) {
      // Save to database
      dbRecord = await prisma.whatsAppMessage.create({
        data: {
          to: formattedTo,
          from: properlyFormattedFrom,
          message,
          messageSid: twilioMessage.sid,
          status: twilioMessage.status || 'sent',
          direction: 'outbound',
          sentAt: new Date(),
        },
      });
    }

    return {
      success: true,
      messageSid: twilioMessage.sid,
      dbRecord,
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);

    // Format numbers for error case too
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const formattedFrom = process.env.TWILIO_WHATSAPP_NUMBER!;
    const properlyFormattedFrom = formattedFrom.startsWith('whatsapp:') ? formattedFrom : `whatsapp:${formattedFrom}`;

    let dbRecord;
    if (saveToDb) {
      try {
        // Save failed message to database
        dbRecord = await prisma.whatsAppMessage.create({
          data: {
            to: formattedTo,
            from: properlyFormattedFrom,
            message,
            status: 'failed',
            direction: 'outbound',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorCode: (error as any)?.code?.toString(),
          },
        });
      } catch (dbError) {
        console.error('Error saving failed message to DB:', dbError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      dbRecord,
    };
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
