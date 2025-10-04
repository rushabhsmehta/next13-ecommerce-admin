import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      message,
      saveToDb = true,
      media,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    if (!message && !media) {
      return NextResponse.json(
        { error: 'Provide either message or media' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanTo = to.replace('whatsapp:', '');
    if (!phoneRegex.test(cleanTo)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    // Send the message
    const result = await sendWhatsAppMessage({
      to: cleanTo,
      message,
      saveToDb,
      media,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        status: 'Message sent successfully',
        dbRecord: result.dbRecord,
        provider: result.provider,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          dbRecord: result.dbRecord,
          provider: result.provider,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in WhatsApp send API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Send API',
    usage: {
      method: 'POST',
      body: {
        to: 'Phone number with country code (e.g., +1234567890)',
        message: 'Message content',
        saveToDb: 'Boolean (optional, defaults to true)',
      },
    },
  });
}
