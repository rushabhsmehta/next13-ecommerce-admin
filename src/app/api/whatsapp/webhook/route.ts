import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, updateMessageStatus, sendWhatsAppMessage } from '@/lib/whatsapp';

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

/**
 * Find WhatsAppCustomer by phone number
 */
const findCustomerByPhone = async (prisma: any, phoneNumber: string) => {
  if (!phoneNumber) return null;
  
  const normalized = normalizeE164(phoneNumber);
  if (!normalized) return null;
  
  try {
    const customer = await prisma.whatsAppCustomer.findFirst({
      where: {
        phoneNumber: normalized,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    });
    
    return customer;
  } catch (error) {
    console.error('❌ Error finding customer by phone:', error);
    return null;
  }
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

const safeParseJson = (input: unknown) => {
  if (!input) return undefined;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (err) {
      console.warn('⚠️ Failed to parse JSON string', err);
      return undefined;
    }
  }
  if (typeof input === 'object') {
    return input as Record<string, any>;
  }
  return undefined;
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
    case 'interactive': {
      const interactiveType = message.interactive?.type;
      metadata.interactive = {
        type: interactiveType,
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
        bodyText: message.interactive?.body?.text,
        nfmReply: message.interactive?.nfm_reply || message.interactive?.nfmReply,
      };

      if (interactiveType === 'flow_response') {
        const flowResponse = message.interactive?.flow_response || message.interactive?.flowResponse || {};
        const responseJsonRaw = flowResponse?.response_json ?? flowResponse?.responseJson ?? flowResponse?.response;
        const parsedResponse = safeParseJson(responseJsonRaw);
        const summaryCandidate = safeParseJson(flowResponse?.summary) ?? parsedResponse;
        const flowName = flowResponse?.name || flowResponse?.flow_name || message.interactive?.header?.text;
        const flowToken = flowResponse?.flow_token || flowResponse?.flowToken;
        const flowId = flowResponse?.flow_id || flowResponse?.flowId;
        const flowTokenLabel = flowResponse?.flow_token_label || flowResponse?.flowTokenLabel;
        const screenPayload = flowResponse?.screen || flowResponse?.screens || flowResponse?.screen_response;
        metadata.interactive.flowResponse = {
          ...flowResponse,
          parsedResponse,
          summary: summaryCandidate,
        };
        metadata.flowSummary = summaryCandidate;
        metadata.flowSummaryRaw = responseJsonRaw ?? flowResponse?.summary ?? flowResponse;
        if (flowName) metadata.flowName = flowName;
        if (flowToken) metadata.flowToken = flowToken;
        if (flowId) metadata.flowId = flowId;
        if (flowTokenLabel) metadata.flowTokenLabel = flowTokenLabel;
        metadata.flowSubmission = {
          flowId,
          flowName,
          flowToken,
          response: parsedResponse,
          raw: flowResponse,
          screen: screenPayload,
        };
        metadata.textPreview = message.interactive?.body?.text || metadata.textPreview || (flowName ? `Flow response: ${flowName}` : 'Flow response submitted');
        messageBody = metadata.textPreview || 'Flow response submitted';
        break;
      }

      if (interactiveType === 'product') {
        const action = message.interactive?.action || {};
        const catalogId = action.catalog_id || action.catalogId;
        const productRetailerId = action.product_retailer_id || action.productRetailerId;
        metadata.catalog = {
          type: 'product',
          catalogId,
          productRetailerId,
        };
        metadata.textPreview = message.interactive?.body?.text || message.interactive?.header?.text || metadata.textPreview;
        messageBody = metadata.textPreview || 'Catalog product shared';
      } else if (message.interactive?.type === 'product_list') {
        const action = message.interactive?.action || {};
        const sections = Array.isArray(action.sections) ? action.sections : [];
        const catalogId = action.catalog_id || action.catalogId;
        const normalizedSections: Array<{ title?: string; productItems: string[] }> = sections.map((section: any) => {
          const items = Array.isArray(section.product_items)
            ? section.product_items
            : Array.isArray(section.products)
            ? section.products
            : [];
          return {
            title: section.title,
            productItems: items
              .map((item: any) => item?.product_retailer_id || item?.productRetailerId)
              .filter((value: any) => typeof value === 'string' && value.trim().length > 0),
          };
        });
        metadata.catalog = {
          type: 'product_list',
          catalogId,
          sections: normalizedSections,
          productIds: normalizedSections.flatMap((section) => section.productItems),
        };
        metadata.textPreview = message.interactive?.body?.text || message.interactive?.header?.text || metadata.textPreview;
        messageBody = metadata.textPreview || 'Catalog shared';
      } else if (metadata.interactive?.buttonReply?.title) {
        messageBody = `Button reply: ${metadata.interactive.buttonReply.title}`;
        metadata.textPreview = metadata.interactive.buttonReply.title;
      } else if (metadata.interactive?.listReply?.title) {
        messageBody = `List reply: ${metadata.interactive.listReply.title}`;
        metadata.textPreview = metadata.interactive.listReply.title;
      } else {
        messageBody = message.interactive?.body?.text || 'Interactive response';
      }
      break;
    }
    case 'flow': {
      const flowPayload = message.flow || {};
      const flowResponse = flowPayload.flow_response || flowPayload.response || {};
      const responseJsonRaw = flowResponse?.response_json ?? flowPayload?.response_json ?? flowResponse?.response;
      const parsedResponse = safeParseJson(responseJsonRaw);
      const summaryCandidate = safeParseJson(flowResponse?.summary) ?? safeParseJson(flowPayload?.summary) ?? parsedResponse;
      const flowName = flowResponse?.name || flowResponse?.flow_name || flowPayload?.name || flowPayload?.flow_name;
      const flowToken = flowResponse?.flow_token || flowResponse?.flowToken || flowPayload?.flow_token;
      const flowId = flowResponse?.flow_id || flowResponse?.flowId || flowPayload?.flow_id;
      const flowTokenLabel = flowResponse?.flow_token_label || flowResponse?.flowTokenLabel || flowPayload?.flow_token_label;
  const screenPayload = flowResponse?.screen || flowResponse?.screens || flowPayload?.screen;
      metadata.whatsappType = 'flow';
      metadata.flowSummary = summaryCandidate;
  metadata.flowSummaryRaw = responseJsonRaw ?? flowResponse?.summary ?? flowPayload?.summary ?? flowPayload;
      if (flowName) metadata.flowName = flowName;
      if (flowToken) metadata.flowToken = flowToken;
      if (flowTokenLabel) metadata.flowTokenLabel = flowTokenLabel;
      if (flowId) metadata.flowId = flowId;
      metadata.flowSubmission = {
        flowId,
        flowName,
        flowToken,
        response: parsedResponse,
        raw: flowPayload,
        screen: screenPayload,
      };
      metadata.textPreview = flowPayload?.body?.text || metadata.textPreview || (flowName ? `Flow response: ${flowName}` : 'Flow response received');
      messageBody = metadata.textPreview || 'Flow response received';
      break;
    }
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

                    // Find customer by phone number for inbound messages
                    let customerId = null;
                    if (fromNumber) {
                      const customer = await findCustomerByPhone(prisma, fromNumber);
                      if (customer) {
                        customerId = customer.id;
                        console.log(`🔗 Linked message to customer: ${customer.firstName} ${customer.lastName || ''} (${customer.phoneNumber})`);
                      }
                    }

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
                        whatsappCustomerId: customerId,
                      },
                    });
                    
                    console.log(`✅ Saved incoming message ${message.id} from ${message.from}`);

                    const flowAckEligible =
                      message.type === 'interactive' &&
                      (message.interactive?.type === 'flow_response' ||
                        message.interactive?.type === 'nfm_reply');

                    if (flowAckEligible && fromNumber) {
                      const flowToken =
                        metadata.flowToken ||
                        metadata.flowSubmission?.flowToken ||
                        metadata.interactive?.flowResponse?.flow_token ||
                        metadata.interactive?.flowResponse?.flowToken;
                      const flowName = metadata.flowName || metadata.flowSubmission?.flowName;
                      const acknowledgement =
                        'Thank you. We received your response. Our representative will contact you soon.';

                      try {
                        await sendWhatsAppMessage({
                          to: fromNumber,
                          message: acknowledgement,
                          context: { messageId: message.id },
                          metadata: {
                            automation: 'flow-auto-acknowledgement',
                            flowToken,
                            flowName,
                            sourceMessageId: message.id,
                          },
                          tags: ['flow-auto-ack'],
                        });
                        console.log('🤖 Sent flow acknowledgement to', fromNumber);
                      } catch (ackError) {
                        console.error('❌ Failed to send flow acknowledgement', ackError);
                      }
                    }
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
