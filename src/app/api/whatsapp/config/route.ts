import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = {
      isTwilioConfigured: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_WHATSAPP_NUMBER,
      accountSid: process.env.TWILIO_ACCOUNT_SID ? `••••••••${process.env.TWILIO_ACCOUNT_SID.slice(-4)}` : 'Not configured',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured',
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
