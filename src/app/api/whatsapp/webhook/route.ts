import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';

// GET for verification (Cloud API)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === process.env.WHATSAPP_CLOUD_VERIFY_TOKEN) {
      return new NextResponse(challenge || '', { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}

// POST for incoming messages and status updates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WhatsApp webhook] body:', JSON.stringify(body));

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        // Status notifications
        const statuses = value?.statuses || [];
        for (const s of statuses) {
          const messageId = s?.id;
          const status = s?.status; // delivered, sent, read, failed
          if (messageId && status) {
            await prisma.whatsAppMessage.updateMany({
              where: { messageSid: messageId },
              data: {
                status,
                updatedAt: new Date(),
                ...(status === 'delivered' ? { deliveredAt: new Date() } : {}),
                errorCode: s?.errors?.[0]?.code ? String(s.errors[0].code) : undefined,
                errorMessage: s?.errors?.[0]?.title || undefined,
              },
            });
          }
        }

        // Incoming messages
        const messages = value?.messages || [];
        for (const m of messages) {
          const from = m?.from;
          const msgId = m?.id;
          const text = m?.text?.body || m?.interactive?.button_reply?.title || '';
          if (from && msgId) {
            try {
              await prisma.whatsAppMessage.create({
                data: {
                  to: `whatsapp:${process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || ''}`,
                  from: `whatsapp:+${from}`,
                  message: text,
                  messageSid: msgId,
                  status: 'received',
                  direction: 'inbound',
                  sentAt: new Date(),
                },
              });
            } catch (e) {
              console.warn('Failed to persist inbound message:', (e as any)?.message || e);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp webhook] error handling request:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
