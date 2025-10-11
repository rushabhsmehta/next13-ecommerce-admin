import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updateMessageStatus } from '@/lib/whatsapp';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

const normalizeE164 = (input?: string | null): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.toString().trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (trimmed.startsWith('whatsapp:')) {
    return normalizeE164(trimmed.replace(/^whatsapp:/i, ''));
  }
  return `+${digits}`;
};

const fetchMediaMimeType = async (mediaId?: string | null) => {
  if (!mediaId || !META_WHATSAPP_ACCESS_TOKEN) return undefined;
  try {
    const res = await fetch(`${GRAPH_BASE_URL}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
      },
    });
    if (!res.ok) {
      console.warn('⚠️ Failed to fetch media metadata', mediaId, res.status);
      return undefined;
    }
    const json = await res.json();
    return json?.mime_type as string | undefined;
  } catch (error) {
    console.error('❌ Error fetching media metadata', mediaId, error);
    return undefined;
  }
};

const buildIncomingMetadata = async (value: any, message: any) => {
  const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
  const primaryContact = contacts[0] || {};
  const profileName = primaryContact?.profile?.name;
  const waId = primaryContact?.wa_id;

  const metadata: Record<string, any> = {
    whatsappType: message.type || 'text',
    contactName: profileName,
    waId,
    textPreview: message.text?.body || message.caption,
    rawMessage: message,
    rawPayload: value,
  };

  let messageBody = message.text?.body || `[${message.type}]`;

  switch (message.type) {
    case 'text':
      metadata.textPreview = message.text?.body;
      messageBody = message.text?.body || '';
      break;
    case 'image':
      metadata.media = {
        id: message.image?.id,
        caption: message.image?.caption,
        sha256: message.image?.sha256,
        mimeType: message.image?.mime_type,
      };
      if (!metadata.media.mimeType) {
        metadata.media.mimeType = await fetchMediaMimeType(message.image?.id);
      }
      metadata.textPreview = message.image?.caption;
      messageBody = message.image?.caption || '📷 Image';
      break;
    case 'video':
      metadata.media = {
        id: message.video?.id,
        caption: message.video?.caption,
        sha256: message.video?.sha256,
        mimeType: message.video?.mime_type,
      };
      if (!metadata.media.mimeType) {
        metadata.media.mimeType = await fetchMediaMimeType(message.video?.id);
      }
      messageBody = message.video?.caption || '🎞️ Video';
      break;
    case 'audio':
    case 'voice':
      metadata.media = {
        id: message.audio?.id,
        sha256: message.audio?.sha256,
        mimeType: message.audio?.mime_type,
      };
      if (!metadata.media.mimeType) {
        metadata.media.mimeType = await fetchMediaMimeType(message.audio?.id);
      }
      messageBody = '🎧 Audio message';
      break;
    case 'document':
      metadata.media = {
        id: message.document?.id,
        filename: message.document?.filename,
        caption: message.document?.caption,
        mimeType: message.document?.mime_type,
        sha256: message.document?.sha256,
      };
      if (!metadata.media.mimeType) {
        metadata.media.mimeType = await fetchMediaMimeType(message.document?.id);
      }
      messageBody = message.document?.filename || '📄 Document';
      break;
    case 'sticker':
      metadata.media = {
        id: message.sticker?.id,
        mimeType: message.sticker?.mime_type,
        sha256: message.sticker?.sha256,
      };
      if (!metadata.media.mimeType) {
        metadata.media.mimeType = await fetchMediaMimeType(message.sticker?.id);
      }
      messageBody = '🩵 Sticker';
      break;
    case 'location':
      metadata.location = {
        latitude: Number(message.location?.latitude),
        longitude: Number(message.location?.longitude),
        name: message.location?.name,
        address: message.location?.address,
        url: message.location?.url,
      };
      messageBody = metadata.location.name
        ? `📍 ${metadata.location.name}`
        : '📍 Location shared';
      break;
    case 'contacts':
      metadata.sharedContacts = message.contacts;
      metadata.textPreview = 'Shared contact';
      messageBody = Array.isArray(message.contacts) && message.contacts.length > 1
        ? `Shared ${message.contacts.length} contacts`
        : 'Shared contact';
      break;
    case 'interactive':
      metadata.interactive = {
        type: message.interactive?.type,
        buttonReply: message.interactive?.button_reply
          ? {
              id: message.interactive.button_reply.id,
              title: message.interactive.button_reply.title,
              payload: message.interactive.button_reply.payload,
            }
          : undefined,
        listReply: message.interactive?.list_reply
          ? {
              id: message.interactive.list_reply.id,
              title: message.interactive.list_reply.title,
              description: message.interactive.list_reply.description,
            }
          : undefined,
        original: message.interactive,
      };
      if (metadata.interactive?.buttonReply?.title) {
        messageBody = `Button reply: ${metadata.interactive.buttonReply.title}`;
        metadata.textPreview = metadata.interactive.buttonReply.title;
      } else if (metadata.interactive?.listReply?.title) {
        messageBody = `List reply: ${metadata.interactive.listReply.title}`;
        metadata.textPreview = metadata.interactive.listReply.title;
      } else {
        messageBody = 'Interactive response';
      }
      break;
    case 'reaction':
      metadata.reaction = message.reaction;
      messageBody = `Reacted with ${message.reaction?.emoji || 'reaction'}`;
      break;
    default:
      metadata.textPreview = message.text?.body || message.caption || metadata.textPreview;
  }

  return { messageBody, metadata };
};

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
  // Enhanced logging for debugging
  const timestamp = new Date().toISOString();
  console.log('🔔 ============================================');
  console.log(`🔔 Webhook POST received at: ${timestamp}`);
  console.log('🔔 ============================================');
  
  try {
    const body = await request.json();
    
    // Log the full payload for debugging
    console.log('📦 Full webhook payload:', JSON.stringify(body, null, 2));

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
                console.log(`📬 Found ${value.messages.length} incoming message(s)`);
                
                for (const message of value.messages) {
                  const incomingData = {
                    from: message.from,
                    type: message.type,
                    text: message.text?.body,
                    timestamp: message.timestamp,
                    messageId: message.id,
                  };
                  
                  console.log('📨 ========== INCOMING MESSAGE ==========');
                  console.log('📨 From:', message.from);
                  console.log('📨 Type:', message.type);
                  console.log('📨 Text:', message.text?.body);
                  console.log('📨 Message ID:', message.id);
                  console.log('📨 Timestamp:', message.timestamp);
                  console.log('📨 Full message object:', JSON.stringify(message, null, 2));

                  // Save incoming message to database
                  try {
                    const businessNumber = normalizeE164(value.metadata?.display_phone_number);
                    const fromNumber = normalizeE164(message.from);
                    const toAddress = businessNumber ? `whatsapp:${businessNumber}` : (value.metadata?.phone_number_id || 'business');

                    const { messageBody, metadata } = await buildIncomingMetadata(value, message);
                    metadata.timestamp = message.timestamp ? Number(message.timestamp) : undefined;

                    const savedMessage = await prisma.whatsAppMessage.create({
                      data: {
                        to: toAddress,
                        from: fromNumber ? `whatsapp:${fromNumber}` : message.from,
                        message: messageBody,
                        messageSid: message.id,
                        status: 'received',
                        direction: 'inbound',
                        metadata: metadata as any,
                        payload: value as any,
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

    console.log('⚠️  Unknown webhook event - object type:', body.object);
    console.log('⚠️  Full body:', JSON.stringify(body, null, 2));
    return NextResponse.json({ success: false, message: 'Unknown webhook event' });
  } catch (error: any) {
    console.error('❌ ========== WEBHOOK ERROR ==========');
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Full error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
