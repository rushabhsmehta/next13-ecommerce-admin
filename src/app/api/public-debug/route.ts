import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'WhatsApp Configuration',
    configuration: {
      aiSensyApiKey: process.env.AISENSY_API_KEY ? 'Configured' : 'Not configured',
      aiSensySenderId: process.env.AISENSY_SENDER_ID || 'Not configured',
      aiSensyAuthToken: process.env.AISENSY_AUTH_TOKEN ? 'Configured' : 'Not configured',
      hasCredentials: !!(process.env.AISENSY_API_KEY && process.env.AISENSY_AUTH_TOKEN && process.env.AISENSY_SENDER_ID),
      timestamp: new Date().toISOString()
    }
  });
}
