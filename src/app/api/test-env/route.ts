import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    aiSensyApiKey: process.env.AISENSY_API_KEY ? 'Set' : 'Not Set',
    aiSensyAuthToken: process.env.AISENSY_AUTH_TOKEN ? 'Set' : 'Not Set',
    aiSensySenderId: process.env.AISENSY_SENDER_ID,
    nodeEnv: process.env.NODE_ENV,
  });
}
