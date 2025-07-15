import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio-whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, body: messageBody, mediaUrl } = body;

    // Validate required fields
    if (!to || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message body are required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Use international format (e.g., +919876543210)' },
        { status: 400 }
      );
    }

    // Send the message
    const result = await sendWhatsAppMessage({ to, body: messageBody, mediaUrl });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in send WhatsApp message API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send WhatsApp message'
      },
      { status: 500 }
    );
  }
}
