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
      console.log('✅ Received WhatsApp webhook event');

      // Import Prisma client once
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // Process webhook entries
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;

              // Handle message status updates
              if (value.statuses) {
                for (const status of value.statuses) {
                  const messageId = status.id;
                  const statusValue = status.status; // sent, delivered, read, failed

                  console.log(`📊 Message ${messageId} status: ${statusValue}`);

                  try {
                    await updateMessageStatus(messageId, statusValue);
                  } catch (error) {
                    console.error('❌ Error updating message status:', error);
                  }
                }
              }

              // Handle incoming messages
              if (value.messages) {
                for (const message of value.messages) {
                  const incomingData = {
                    from: message.from,
                    type: message.type,
                    text: message.text?.body,
                    timestamp: message.timestamp,
                    messageId: message.id,
                  };
                  
                  console.log('📨 Incoming message:', incomingData);

                  // Save incoming message to database
                  try {
                    const savedMessage = await prisma.whatsAppMessage.create({
                      data: {
                        to: value.metadata?.phone_number_id || 'business',
                        from: message.from,
                        message: message.text?.body || `[${message.type}]`,
                        messageSid: message.id,
                        status: 'received',
                        direction: 'inbound',
                      },
                    });
                    
                    console.log(`✅ Saved incoming message ${message.id} from ${message.from}`);
                  } catch (dbError) {
                    console.error('❌ Error saving incoming message to database:', dbError);
                  }

                  // TODO: Implement auto-replies or business logic here
                }
              }
            }
          }
        }
      } finally {
        await prisma.$disconnect();
      }

      return NextResponse.json({ success: true, message: 'Webhook processed' });
    }

    return NextResponse.json({ success: false, message: 'Unknown webhook event' });
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
