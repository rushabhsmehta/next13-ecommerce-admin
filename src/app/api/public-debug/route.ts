import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'WhatsApp Configuration',
    configuration: {
      metaPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID ? 'Configured' : 'Not configured',
      metaAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ? 'Configured' : 'Not configured',
      metaApiVersion: process.env.META_GRAPH_API_VERSION || 'v22.0 (default)',
      hasCredentials: !!(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN),
      timestamp: new Date().toISOString()
    }
  });
}
