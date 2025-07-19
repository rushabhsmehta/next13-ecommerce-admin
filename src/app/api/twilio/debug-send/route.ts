import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 Template debug request received:', {
      body,
      hasTo: !!body.to,
      hasContentSid: !!body.contentSid,
      contentVariables: body.contentVariables,
      contentVariablesType: typeof body.contentVariables,
      contentVariablesKeys: body.contentVariables ? Object.keys(body.contentVariables) : 'none'
    });

    // Check Twilio environment variables
    const twilioConfig = {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasWhatsAppNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
    };

    console.log('🔧 Twilio configuration:', twilioConfig);

    return NextResponse.json({
      success: true,
      message: 'Debug information logged',
      receivedData: body,
      twilioConfig
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
