import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const testWebhookData = {
    MessageSid: 'SM' + Math.random().toString(36).substr(2, 32),
    From: 'whatsapp:+919876543210', // Generic test number
    To: 'whatsapp:+1234567890',
    Body: 'This is a test message to verify webhook functionality',
    SmsStatus: 'received',
    NumMedia: '0'
  };

  try {
    // Test the webhook processing logic
    const { parseIncomingMessage } = await import('@/lib/twilio-whatsapp');
    const parsed = parseIncomingMessage(testWebhookData);

    return NextResponse.json({
      success: true,
      message: 'Webhook test successful',
      testData: testWebhookData,
      parsedMessage: parsed,
      instructions: [
        'This endpoint tests webhook parsing functionality',
        'Configure your Twilio webhook URL to: https://yourdomain.com/api/whatsapp/webhook',
        'Ensure your webhook endpoint is publicly accessible',
        'Check Twilio Console for webhook configuration'
      ]
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Webhook test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
