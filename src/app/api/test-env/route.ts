import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not Set',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not Set',
    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    nodeEnv: process.env.NODE_ENV,
  });
}
