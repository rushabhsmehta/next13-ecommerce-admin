import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppMessage,
  sendInteractiveMessage,
  scheduleWhatsAppMessage,
  emitWhatsAppEvent,
} from '@/lib/whatsapp';
import type { SessionUpdateInput, WhatsAppInteractiveMessagePayload } from '@/lib/whatsapp';
import whatsappPrisma from '@/lib/whatsapp-prismadb';

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

    // ℹ️ NOTE: We let Meta's API handle 24-hour window validation
    // This is more reliable than checking our database, since:
    // 1. Database might have different phone number formats
    // 2. Meta has the authoritative source of truth
    // 3. Meta's error messages (131047, 131026) are clear
    // We'll catch and display Meta's errors to the user
    
    console.log('📤 Attempting to send message to:', cleanTo);

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
      // Enhanced error response with Meta error details
      const errorDetail = result.error || 'Unknown error occurred';
      const is24HourError = errorDetail.includes('131047') || errorDetail.includes('131026') || errorDetail.includes('re-engagement');
      
      console.error('❌ WhatsApp message send failed:', {
        error: errorDetail,
        is24HourError,
        to: cleanTo,
      });

      // Try to extract Meta error code if available
      let metaErrorCode = null;
      let metaErrorMessage = errorDetail;
      
      // Check if error contains Meta error code pattern
      const errorCodeMatch = errorDetail.match(/\((\d+)\)/);
      if (errorCodeMatch) {
        metaErrorCode = parseInt(errorCodeMatch[1]);
      }

      return NextResponse.json(
        {
          success: false,
          error: is24HourError 
            ? 'Cannot send message - 24-hour messaging window expired' 
            : errorDetail,
          details: is24HourError
            ? 'This customer has not messaged you within the last 24 hours. You can only send free-form messages within 24 hours of the customer\'s last message. Please use an approved template message instead.'
            : metaErrorMessage,
          requiresTemplate: is24HourError,
          metaErrorCode,
          dbRecord: result.dbRecord,
          provider: result.provider,
          rawError: result.error,
        },
        { status: is24HourError ? 403 : 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in WhatsApp send API:', error);
    
    // Extract Meta API error details if available
    const errorMessage = error?.message || 'Internal server error';
    const is24HourError = errorMessage.includes('131047') || errorMessage.includes('131026') || errorMessage.includes('re-engagement');
    
    // Try to parse error response for Meta error code
    let metaErrorCode = null;
    let metaErrorMessage = errorMessage;
    
    if (error?.response) {
      try {
        const errorData = typeof error.response === 'string' ? JSON.parse(error.response) : error.response;
        if (errorData?.error?.code) {
          metaErrorCode = errorData.error.code;
          metaErrorMessage = errorData.error.message || errorMessage;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return NextResponse.json(
      { 
        error: is24HourError 
          ? 'Cannot send message - 24-hour messaging window expired' 
          : 'Failed to send message',
        details: metaErrorMessage,
        requiresTemplate: is24HourError,
        metaErrorCode,
      },
      { status: is24HourError ? 403 : 500 }
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
