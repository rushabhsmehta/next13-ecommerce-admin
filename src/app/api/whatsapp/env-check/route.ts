import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...` : 'Missing',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing',
      twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Missing',
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ? 'Present' : 'Missing',
      whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'Missing',
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'Missing',
    };

    return NextResponse.json({
      success: true,
      message: 'Environment variables check',
      env: envCheck,
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
