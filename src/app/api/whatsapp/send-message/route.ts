import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import whatsappPrisma from '@/lib/whatsapp-prismadb';
import { checkWhatsAppMessagingWindow } from '@/lib/whatsapp';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';

/**
 * Send a free-form text message via WhatsApp Cloud API
 * POST /api/whatsapp/send-message
 * 
 * Body:
 * {
 *   "to": "+919978783238",
 *   "message": "Your message text",
 *   "checkWindow": true  // Optional: check 24-hour window before sending
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { to, message, checkWindow = true } = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let phoneNumber = to;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber.replace(/^\+/, '')}`;
    }

    // Check 24-hour messaging window if requested
    if (checkWindow) {
      const windowCheck = await checkWhatsAppMessagingWindow(phoneNumber);
      
      if (!windowCheck.canMessage) {
        return NextResponse.json({
          error: 'Cannot send message - customer has not messaged you recently',
          details: 'Messages can only be sent within 24 hours of the customer\'s last message. Use a template message instead.',
          canMessage: false,
          requiresTemplate: true,
        }, { status: 403 });
      }

      console.log(`✅ Within 24-hour window. ${windowCheck.hoursRemaining?.toFixed(1)} hours remaining`);
    }

    // Prepare the message payload
    const messagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: true,
        body: message,
      },
    };

    // Send the message via Meta WhatsApp Cloud API
    const apiUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

    console.log(`📤 Sending message to ${phoneNumber}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error from WhatsApp API:', data);
      
      // Check for specific error codes
      if (data.error?.code === 131047) {
        return NextResponse.json({
          error: 'Message rejected - customer has not messaged you within 24 hours',
          details: data.error.message,
          errorCode: data.error.code,
          requiresTemplate: true,
        }, { status: 403 });
      }

      return NextResponse.json({
        error: 'Failed to send message',
        details: data.error?.message || 'Unknown error',
        errorCode: data.error?.code,
      }, { status: response.status });
    }

    // Save the sent message to database
    try {
      const savedMessage = await whatsappPrisma.whatsAppMessage.create({
        data: {
          to: `whatsapp:${phoneNumber.replace(/^\+/, '')}`,
          from: `whatsapp:${META_WHATSAPP_PHONE_NUMBER_ID}`,
          message: message,
          messageSid: data.messages[0].id,
          status: 'sent',
          direction: 'outbound',
          metadata: {
            whatsappType: 'text',
          },
          payload: messagePayload,
        },
      });

      console.log(`✅ Message sent and saved: ${data.messages[0].id}`);

      return NextResponse.json({
        success: true,
        messageId: data.messages[0].id,
        databaseId: savedMessage.id,
        to: phoneNumber,
        message: message,
      });
    } catch (dbError) {
      console.error('⚠️  Message sent but failed to save to database:', dbError);
      
      // Still return success since the message was sent
      return NextResponse.json({
        success: true,
        messageId: data.messages[0].id,
        to: phoneNumber,
        message: message,
        warning: 'Message sent but not saved to database',
      });
    }
  } catch (error: any) {
    console.error('❌ Error sending message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get messaging window status for a phone number
 * GET /api/whatsapp/send-message?to=+919978783238
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to');

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required parameter: to' },
        { status: 400 }
      );
    }

    const windowCheck = await checkWhatsAppMessagingWindow(to);

    return NextResponse.json({
      phoneNumber: to,
      canMessage: windowCheck.canMessage,
      hoursRemaining: windowCheck.hoursRemaining,
      lastInboundMessage: windowCheck.lastInboundMessage ? {
        id: windowCheck.lastInboundMessage.id,
        message: windowCheck.lastInboundMessage.message,
        createdAt: windowCheck.lastInboundMessage.createdAt,
      } : null,
      recommendation: windowCheck.canMessage 
        ? 'You can send free-form messages' 
        : 'Use a template message - customer has not messaged you recently',
    });
  } catch (error: any) {
    console.error('❌ Error checking messaging window:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
