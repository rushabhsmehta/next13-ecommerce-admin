import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, SendMessageOptions } from '@/lib/twilio-whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, mediaUrl }: SendMessageOptions = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +919876543210)' },
        { status: 400 }
      );
    }

    // Send the message
    const result = await sendWhatsAppMessage({ to, message, mediaUrl });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('Error in send WhatsApp message API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send WhatsApp message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageSid = searchParams.get('messageSid');

    if (!messageSid) {
      return NextResponse.json(
        { error: 'Message SID is required' },
        { status: 400 }
      );
    }

    const { getMessageStatus } = await import('@/lib/twilio-whatsapp');
    const status = await getMessageStatus(messageSid);

    return NextResponse.json({
      success: true,
      messageSid,
      status
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching message status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch message status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
