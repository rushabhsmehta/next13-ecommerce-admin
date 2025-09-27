import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const aiSensyConfigured = !!(process.env.AISENSY_API_KEY && process.env.AISENSY_AUTH_TOKEN && process.env.AISENSY_SENDER_ID);

    const envCheck = {
      mode: aiSensyConfigured ? 'aisensy' : 'incomplete',
      apiKey: process.env.AISENSY_API_KEY ? 'Present' : 'Missing',
      authToken: process.env.AISENSY_AUTH_TOKEN ? 'Present' : 'Missing',
      senderId: process.env.AISENSY_SENDER_ID || 'Missing',
      defaultCampaign: process.env.AISENSY_DEFAULT_CAMPAIGN_NAME || process.env.AISENSY_DEFAULT_CAMPAIGN || 'Missing',
      apiBase: process.env.AISENSY_API_BASE || 'https://backend.aisensy.com',
    };

    const guidance = aiSensyConfigured
      ? 'AiSensy detected: app will use AiSensy API for messaging.'
      : 'AiSensy not fully configured: set AISENSY_API_KEY, AISENSY_AUTH_TOKEN, AISENSY_SENDER_ID, and default campaign environment variables.';

    return NextResponse.json({
      success: true,
      message: 'Environment variables check (AiSensy)',
      env: envCheck,
      guidance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
