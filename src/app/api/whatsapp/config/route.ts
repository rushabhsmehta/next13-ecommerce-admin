import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const isCloudConfigured = !!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN && !!process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
    const config = {
      isTwilioConfigured: false,
      isCloudConfigured,
      accountSid: isCloudConfigured ? 'Cloud API' : 'Not configured',
      whatsappNumber: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID ? `whatsapp:${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}` : 'Not configured',
    };
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

