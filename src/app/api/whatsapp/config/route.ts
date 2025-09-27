import { NextResponse } from 'next/server';

function resolveDefaultCampaign() {
  return process.env.AISENSY_DEFAULT_CAMPAIGN_NAME || process.env.AISENSY_DEFAULT_CAMPAIGN;
}

export async function GET() {
  try {
    const isAiSensyConfigured = !!(process.env.AISENSY_API_KEY && resolveDefaultCampaign());

    const config = {
      provider: isAiSensyConfigured ? 'aisensy' : 'unknown',
      whatsappNumber: process.env.AISENSY_SENDER_ID ? `whatsapp:${process.env.AISENSY_SENDER_ID.replace(/^whatsapp:/, '')}` : 'Not configured',
      isAiSensyConfigured,
      aiSensy: isAiSensyConfigured ? {
        apiBase: process.env.AISENSY_API_BASE || 'https://backend.aisensy.com',
        defaultCampaign: resolveDefaultCampaign(),
        defaultSource: process.env.AISENSY_DEFAULT_SOURCE || null,
        defaultTags: (process.env.AISENSY_DEFAULT_TAGS || '')
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean),
        defaultUsername: process.env.AISENSY_DEFAULT_USERNAME || null,
      } : null,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

