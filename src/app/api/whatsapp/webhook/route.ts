import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updateMessageStatus } from '@/lib/whatsapp';

/**
 * Webhook verification endpoint for Meta WhatsApp
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!mode || !token) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const verifiedChallenge = verifyWebhookSignature(mode, token, challenge || '');
  
  if (verifiedChallenge) {
    console.log('Webhook verified successfully');
    return new NextResponse(verifiedChallenge, { status: 200 });
  }

  console.error('Webhook verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Webhook event handler for incoming WhatsApp messages and status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends a test POST request during webhook setup
    if (body.object === 'whatsapp_business_account') {
      console.log('Received WhatsApp webhook event:', JSON.stringify(body, null, 2));

      // Process webhook entries
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const value = change.value;

            // Handle message status updates
            if (value.statuses) {
              value.statuses.forEach(async (status: any) => {
                const messageId = status.id;
                const statusValue = status.status; // sent, delivered, read, failed

                console.log(`Message ${messageId} status: ${statusValue}`);

                // Update database
                try {
                  await updateMessageStatus(messageId, statusValue);
                } catch (error) {
                  console.error('Error updating message status:', error);
                }
              });
            }

            // Handle incoming messages
            if (value.messages) {
              value.messages.forEach((message: any) => {
                console.log('Incoming message:', {
                  from: message.from,
                  type: message.type,
                  text: message.text?.body,
                  timestamp: message.timestamp,
                });

                // TODO: Handle incoming messages
                // You can implement auto-replies, save to database, etc.
              });
            }
          }
        });
      });

      return NextResponse.json({ success: true, message: 'Webhook processed' });
    }

    return NextResponse.json({ success: false, message: 'Unknown webhook event' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
