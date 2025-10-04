import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const metaConfigured = !!(
      process.env.META_WHATSAPP_PHONE_NUMBER_ID && 
      process.env.META_WHATSAPP_ACCESS_TOKEN
    );

    const envCheck = {
      mode: metaConfigured ? 'meta' : 'incomplete',
      phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID || 'Missing',
      accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ? 'Present' : 'Missing',
      apiVersion: process.env.META_GRAPH_API_VERSION || 'v22.0 (default)',
    };

    const guidance = metaConfigured
      ? 'Meta WhatsApp Cloud API configured successfully.'
      : 'Meta WhatsApp not fully configured: set META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN environment variables.';

    return NextResponse.json({
      success: true,
      message: 'Environment variables check (Meta WhatsApp Cloud API)',
      env: envCheck,
      guidance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
