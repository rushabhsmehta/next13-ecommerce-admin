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
              value.messages.forEach(async (message: any) => {
                const incomingData = {
                  from: message.from,
                  type: message.type,
                  text: message.text?.body,
                  timestamp: message.timestamp,
                  messageId: message.id,
                };
                
                console.log('Incoming message:', incomingData);

                // Save incoming message to database
                try {
                  const { PrismaClient } = await import('@prisma/client');
                  const prisma = new PrismaClient();
                  
                  await prisma.whatsAppMessage.create({
                    data: {
                      to: value.metadata?.phone_number_id || 'business',
                      from: message.from,
                      message: message.text?.body || `[${message.type}]`,
                      messageSid: message.id,
                      status: 'received',
                      direction: 'inbound',
                    },
                  });
                  
                  await prisma.$disconnect();
                  console.log(`Saved incoming message ${message.id} from ${message.from}`);
                } catch (dbError) {
                  console.error('Error saving incoming message to database:', dbError);
                }

                // TODO: Implement auto-replies or business logic here
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
