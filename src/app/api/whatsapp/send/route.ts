import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  sendInteractiveMessage,
  scheduleWhatsAppMessage,
  emitWhatsAppEvent,
} from '@/lib/whatsapp';
import type { SessionUpdateInput, WhatsAppInteractiveMessagePayload } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      message,
      media,
      interactive,
      reaction,
      context,
      previewUrl,
      type,
      scheduleFor,
      metadata,
      saveToDb = true,
      session: sessionHintsInput,
      automationId,
      tags,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    if (!message && !media && !interactive && !reaction) {
      return NextResponse.json(
        { error: 'Provide message, media, interactive payload, or reaction' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanTo = to.replace('whatsapp:', '');
    if (!phoneRegex.test(cleanTo)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    let sessionHints: SessionUpdateInput | undefined;
    if (sessionHintsInput && typeof sessionHintsInput === 'object') {
      sessionHints = {
        flowToken: sessionHintsInput.flowToken,
        waId: sessionHintsInput.waId,
        phoneNumber: cleanTo,
        contextPatch: sessionHintsInput.contextPatch || sessionHintsInput.context,
        lastScreen: sessionHintsInput.lastScreen,
        lastAction: sessionHintsInput.lastAction,
        lastMessageId: sessionHintsInput.lastMessageId,
        expiresAt: sessionHintsInput.expiresAt,
      };
    }

    const payload: any = {
      to: cleanTo,
      message,
      media,
      reaction,
      context,
      previewUrl,
      scheduleFor,
      metadata,
      saveToDb,
      sessionHints,
      automationId,
      tags,
    };

    if (interactive) {
      payload.interactive = interactive as WhatsAppInteractiveMessagePayload;
    }

    const sendFn =
      type === 'interactive' || interactive
        ? sendInteractiveMessage
        : scheduleFor
        ? scheduleWhatsAppMessage
        : sendWhatsAppMessage;

    const result = await sendFn(payload);

    if (result.success) {
      if (result.dbRecord?.id) {
        await emitWhatsAppEvent('message.api.dispatched', {
          sessionId: result.dbRecord.sessionId ?? undefined,
          messageId: result.dbRecord.id,
          context: {
            route: 'api/whatsapp/send',
            scheduled: result.dbRecord.status === 'scheduled',
          },
        });
      }

      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        status: result.dbRecord?.status === 'scheduled' ? 'Message scheduled' : 'Message sent successfully',
        dbRecord: result.dbRecord,
        provider: result.provider,
        scheduledFor: result.dbRecord?.scheduledAt?.toISOString?.(),
        raw: result.rawResponse,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          dbRecord: result.dbRecord,
          provider: result.provider,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in WhatsApp send API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Send API',
    usage: {
      method: 'POST',
      body: {
        to: 'Phone number with country code (e.g., +1234567890)',
        message: 'Message content (optional when sending media/interactive)',
        media: '{ url, type, caption } (optional)',
        interactive: '{ type: "button" | "list", ... } (optional)',
        reaction: '{ messageId, emoji } (optional)',
        previewUrl: 'Boolean (optional, enable for link previews)',
        scheduleFor: 'ISO8601 string or timestamp for future sends',
        metadata: 'Arbitrary JSON stored with the message',
        session: '{ flowToken, waId, contextPatch, lastScreen, lastAction }',
        saveToDb: 'Boolean (optional, defaults to true)',
      },
    },
  });
}
