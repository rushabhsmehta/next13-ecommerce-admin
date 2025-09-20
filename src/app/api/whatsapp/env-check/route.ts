import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cloudConfigured = !!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN && !!process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID && !!process.env.WHATSAPP_CLOUD_WABA_ID;

    const envCheck = {
      mode: cloudConfigured ? 'cloud' : 'incomplete',
      phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID ? `${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}` : 'Missing',
      wabaId: process.env.WHATSAPP_CLOUD_WABA_ID ? `${process.env.WHATSAPP_CLOUD_WABA_ID}` : 'Missing',
      accessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN ? 'Present' : 'Missing',
      apiVersion: process.env.WHATSAPP_CLOUD_API_VERSION || 'v19.0',
      verifyTokenSet: !!process.env.WHATSAPP_CLOUD_VERIFY_TOKEN,
    };

    const guidance = cloudConfigured
      ? 'WhatsApp Cloud API detected: app will use Cloud API for messaging.'
      : 'Cloud API not fully configured: set WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID and WHATSAPP_CLOUD_WABA_ID.';

    return NextResponse.json({
      success: true,
      message: 'Environment variables check (Cloud API)',
      env: envCheck,
      guidance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
