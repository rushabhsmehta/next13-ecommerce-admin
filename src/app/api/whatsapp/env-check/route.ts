import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const twilioConfigured = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;

    const envCheck = {
      mode: twilioConfigured ? 'twilio' : 'incomplete',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'Missing',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing',
      twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Missing',
    };

    const guidance = twilioConfigured
      ? 'Twilio detected: app will use Twilio for WhatsApp messaging.'
      : 'Twilio not configured: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_NUMBER to enable WhatsApp messaging.';

    return NextResponse.json({
      success: true,
      message: 'Environment variables check',
      env: envCheck,
      guidance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
