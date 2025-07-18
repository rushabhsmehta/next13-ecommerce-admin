import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'WhatsApp Configuration',
    configuration: {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || 'Not configured',
      twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured',
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'Not configured',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Not configured',
      hasCredentials: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      timestamp: new Date().toISOString()
    }
  });
}
