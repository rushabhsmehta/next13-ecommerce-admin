import { NextResponse } from 'next/server';

function getActiveProvider(): 'meta' | 'unknown' {
  const isMetaConfigured = !!(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN);
  return isMetaConfigured ? 'meta' : 'unknown';
}

export async function GET() {
  try {
    const activeProvider = getActiveProvider();
    const isMetaConfigured = !!(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN);

    const config = {
      provider: activeProvider,
      whatsappNumber: isMetaConfigured 
        ? `whatsapp:${process.env.META_WHATSAPP_PHONE_NUMBER_ID}`
        : 'Not configured',
      isMetaConfigured,
      isCloudConfigured: isMetaConfigured,
      meta: isMetaConfigured ? {
        phoneNumberId: process.env.META_WHATSAPP_PHONE_NUMBER_ID,
        apiVersion: process.env.META_GRAPH_API_VERSION || 'v22.0',
        hasAccessToken: !!process.env.META_WHATSAPP_ACCESS_TOKEN,
      } : null,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
