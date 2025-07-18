import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import prisma from '@/lib/prismadb';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function GET(request: NextRequest) {
  try {
    console.log('Public debug endpoint called');
    
    // Check if Twilio credentials are configured
    const credentialsCheck = {
      twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      actualWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      hasCorrectFormat: process.env.TWILIO_WHATSAPP_NUMBER?.startsWith('whatsapp:') || false
    };

    // Get recent messages to check delivery status
    let recentMessages: any[] = [];
    try {
      const messages = await client.messages.list({ limit: 5 });
      recentMessages = messages.map(message => ({
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        direction: message.direction,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      }));
    } catch (messageError) {
      console.error('Error fetching recent messages:', messageError);
    }

    // Get recent database messages
    let dbMessages: any[] = [];
    try {
      const messages = await (prisma as any).whatsAppMessage.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      dbMessages = messages;
    } catch (dbError) {
      console.error('Error fetching database messages:', dbError);
    }

    const response = {
      credentialsCheck,
      recentMessages,
      dbMessages,
      webhookUrls: {
        whatsappWebhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
        twilioWebhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/webhook`,
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
