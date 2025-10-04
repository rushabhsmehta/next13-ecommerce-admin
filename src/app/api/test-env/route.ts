import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    metaPhoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID ? 'Set' : 'Not Set',
    metaAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ? 'Set' : 'Not Set',
    metaApiVersion: process.env.META_GRAPH_API_VERSION || 'v22.0 (default)',
    nodeEnv: process.env.NODE_ENV,
  });
}
