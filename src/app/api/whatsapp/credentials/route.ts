import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const credentials = {
      twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      // Optional WhatsApp Business API credentials (for direct Meta integration)
      whatsappAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      whatsappBusinessAccountId: !!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      whatsappPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID
    };

    const twilioConfigured = credentials.twilioAccountSid && credentials.twilioAuthToken && credentials.twilioWhatsappNumber;
    const whatsappApiConfigured = credentials.whatsappAccessToken && credentials.whatsappBusinessAccountId;
    const allConfigured = twilioConfigured; // We only need Twilio for basic functionality

    return NextResponse.json({
      success: true,
      status: {
        allConfigured,
        twilioConfigured,
        whatsappApiConfigured, // Optional for direct Meta integration
        credentials,
        missing: Object.entries(credentials)
          .filter(([_, configured]) => !configured)
          .map(([key, _]) => key)
      },
      setup: {
        twilio: twilioConfigured ? 'configured' : 'missing',
        whatsappApi: whatsappApiConfigured ? 'configured' : 'optional',
        recommendation: twilioConfigured ? 'Ready to use Twilio WhatsApp' : 'Configure Twilio credentials to get started',
        setupGuide: 'Check .env.local file for required Twilio configuration'
      }
    });

  } catch (error) {
    console.error('Error checking credentials:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check credential status' 
      },
      { status: 500 }
    );
  }
}
