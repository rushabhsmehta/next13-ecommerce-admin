import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppTemplate, emitWhatsAppEvent } from '@/lib/whatsapp';
import type { SessionUpdateInput } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('========== Send Template API Called ==========');
    console.log('[Request Body]:', JSON.stringify(body, null, 2));
    console.log('==============================================');
    
    const url = new URL(request.url);
    const qpDebug = url.searchParams.get('debug') === '1';
    const {
      to,
      templateId,
      templateName,
      templateBody,
      languageCode = 'en_US',
      variables,
      saveToDb = true,
      scheduleFor,
      metadata,
      session: sessionHintsInput,
      automationId,
      debug: bodyDebug,
    } = body;
    const debugEnabled = !!bodyDebug || qpDebug || process.env.WHATSAPP_DEBUG === '1';
    const debugEvents: any[] = [];
    if (debugEnabled) {
      const snapshot = {
        to: typeof to === 'string' ? to : undefined,
        templateId,
        templateName,
        languageCode,
        hasVars: !!variables,
      };
      console.log('[send-template] start', snapshot);
      debugEvents.push({ event: 'start', ...snapshot });
    }

    // Validate required fields
    if (!to || (!templateId && !templateName)) {
      return NextResponse.json(
        { error: 'Missing required fields: to and templateName|templateId' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanTo = to.replace('whatsapp:', '');

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

    let resolvedTemplateName = typeof templateName === 'string' && templateName.trim() ? templateName.trim() : undefined;
    let resolvedLanguageCode = typeof languageCode === 'string' && languageCode.trim()
      ? languageCode.trim()
      : 'en_US';

    if (!resolvedTemplateName && typeof templateId === 'string') {
      const [namePart, langPart] = templateId.split(':');
      if (namePart) {
        resolvedTemplateName = namePart;
      }
      if (langPart && (!resolvedLanguageCode || resolvedLanguageCode === 'en_US')) {
        resolvedLanguageCode = langPart;
      }
    }

    if (!resolvedTemplateName) {
      return NextResponse.json(
        { error: 'Provide a WhatsApp-approved templateName.' },
        { status: 400 }
      );
    }

    if (!phoneRegex.test(cleanTo)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    let bodyParams: Array<string | number> = [];
    let buttonParams: Array<{ type: string; parameters?: any[]; sub_type?: string; index?: number }> = [];
    let headerParams: any = undefined;
    
    // Special keys that should NOT be included in bodyParams
    const SPECIAL_KEYS = [
      'header', 'headerImage', 'header_image',
      'flow_token', 'flowToken', 
      'flow_action_data', 'flowActionData',
      'cta_url'
    ];
    
    if (Array.isArray(variables)) {
      bodyParams = variables.map((v: any) => String(v));
    } else if (variables && typeof variables === 'object') {
      const entries = Object.entries(variables as Record<string, any>);
      const flowButtonsList: Array<{ index: number; parameter: any }> = [];
      
      // Check for numeric keys (1, 2, 3, etc.) for body parameters
      const numeric = entries
        .filter(([k]) => /^\d+$/.test(k))
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([, v]) => String(v));
      
      if (numeric.length) {
        bodyParams = numeric;
      } else {
        // If no numeric keys, only use keys that are NOT special keys or button keys
        const regularKeys = Object.keys(variables as any).filter(key => 
          !SPECIAL_KEYS.includes(key) && 
          !key.startsWith('button') && 
          !key.startsWith('_flow_') &&
          !key.startsWith('_')
        );
        
        if (regularKeys.length > 0) {
          bodyParams = regularKeys.map((key) => String((variables as any)[key]));
        }
      }
      
      // Handle header parameters (image, video, document, text)
      if ((variables as any).header || (variables as any).headerImage || (variables as any).header_image) {
        const headerData = (variables as any).header || (variables as any).headerImage || (variables as any).header_image;
        
        if (typeof headerData === 'string') {
          // Assume it's an image URL
          headerParams = {
            type: 'image',
            image: { link: headerData },
          };
        } else if (typeof headerData === 'object') {
          headerParams = headerData;
        }
      }

      Object.entries(variables as Record<string, any>).forEach(([key, value]) => {
        const flowMatch = key.match(/^_flow_button_(\d+)$/);
        if (flowMatch && value && typeof value === 'object') {
          const index = Number(flowMatch[1]);
          const parameter: any = { ...(value as any) };

          if (!parameter.type) {
            parameter.type = 'flow';
          }
          if (!parameter.flow_message_version) {
            parameter.flow_message_version = '3';
          }
          if (!parameter.flow_token) {
            parameter.flow_token = `flow-${Date.now()}-${index}`;
          }
          if (typeof parameter.flow_action_data === 'string') {
            try {
              parameter.flow_action_data = JSON.parse(parameter.flow_action_data);
            } catch {
              // leave as string if parsing fails
            }
          }

          flowButtonsList.push({ index, parameter });
        }
      });
      
      // Handle Flow button parameters
      if ((variables as any).flow_token || (variables as any).flowToken) {
        const flowToken = (variables as any).flow_token || (variables as any).flowToken;
        const actionData: any = {
          flow_token: flowToken,
        };
        
        // Only include flow_action_data if explicitly provided
        const flowActionData = (variables as any).flow_action_data || (variables as any).flowActionData;
        if (flowActionData && Object.keys(flowActionData).length > 0) {
          actionData.flow_action_data = flowActionData;
        }
        
        buttonParams.push({
          type: 'BUTTON',
          sub_type: 'FLOW',
          index: 0,
          parameters: [
            {
              type: 'ACTION',
              action: actionData,
            },
          ],
        });
      }
      
      // Handle URL button parameters
      for (let i = 0; i < 10; i++) {
        const btnKey = `button${i}`;
        const btn = (variables as any)[btnKey];
        if (Array.isArray(btn)) {
          buttonParams.push({
            type: 'button',
            sub_type: 'url',
            index: i,
            parameters: btn.map((v: any) => ({ type: 'text', text: String(v) })),
          });
        }
      }
      if ((variables as any).cta_url) {
        buttonParams.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: String((variables as any).cta_url) }],
        });
      }

      if (flowButtonsList.length) {
        flowButtonsList
          .sort((a, b) => a.index - b.index)
          .forEach(({ index, parameter }) => {
            buttonParams.push({
              type: 'button',
              sub_type: 'flow',
              index,
              parameters: [parameter],
            });
          });
      }
    }

    // Auto-detect Flow templates and add default Flow button if needed
    // If template name contains "flow" and no button params provided, add minimal Flow button
    if ((resolvedTemplateName.toLowerCase().includes('flow') || 
         resolvedTemplateName.toLowerCase().includes('_flow')) && 
        buttonParams.length === 0) {
      console.log('[send-template] Detected Flow template, adding default Flow button parameters');
      // Generate a unique flow token based on phone number and timestamp
      const flowToken = `unique_flow_token_${Date.now()}`;
      
      buttonParams.push({
        type: 'BUTTON',
        sub_type: 'FLOW',
        index: 0,
        parameters: [
          {
            type: 'ACTION',
            action: {
              flow_token: flowToken,
            },
          },
        ],
      });
    }

    console.log('[send-template] Parsed parameters:', {
      bodyParams,
      buttonParams,
      headerParams,
      resolvedTemplateName,
      resolvedLanguageCode,
    });

    const result = await sendWhatsAppTemplate({
      to: cleanTo,
      templateName: resolvedTemplateName,
      templateBody, // Pass template body for better message preview
      languageCode: resolvedLanguageCode,
      bodyParams,
      buttonParams,
      headerParams,
      saveToDb,
      scheduleFor,
      metadata,
      sessionHints,
      automationId,
    });

    console.log('[send-template] Result:', { success: result.success, messageSid: result.messageSid });

    if (result.success) {
      if (result.dbRecord?.id) {
        await emitWhatsAppEvent('message.api.template', {
          sessionId: result.dbRecord.sessionId ?? undefined,
          messageId: result.dbRecord.id,
          context: {
            template: resolvedTemplateName,
            language: resolvedLanguageCode,
            scheduled: result.dbRecord.status === 'scheduled',
            route: 'api/whatsapp/send-template',
          },
        });
      }

      const responsePayload: any = {
        success: true,
        messageSid: result.messageSid,
        status:
          result.dbRecord?.status === 'scheduled'
            ? 'Template scheduled successfully'
            : 'Template message sent successfully',
        dbRecord: result.dbRecord,
        provider: result.provider,
        scheduledFor: result.dbRecord?.scheduledAt?.toISOString?.(),
        raw: result.rawResponse,
      };
      if (debugEnabled) {
        debugEvents.push({ event: 'cloud_send_result', success: true, sid: result.messageSid });
        responsePayload.debug = debugEvents;
      }
      return NextResponse.json(responsePayload);
    }

    if (debugEnabled) {
      debugEvents.push({ event: 'cloud_send_result', success: false, error: result.error });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Send failed',
        provider: result.provider,
        debug: debugEnabled ? debugEvents : undefined,
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('========== Send Template Error ==========');
    console.error('[Error Message]:', error?.message || String(error));
    console.error('[Error Code]:', error?.code);
    console.error('[Error Status]:', error?.status);
    console.error('[Error Response]:', error?.response);
    console.error('[Full Error]:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('=========================================');
    
    const twErr = { 
      message: error?.message || String(error), 
      code: error?.code, 
      status: error?.status, 
      moreInfo: error?.moreInfo, 
      details: error?.details,
      response: error?.response,
    };
    
    const httpStatus = (typeof error?.status === 'number' && error.status >= 400 && error.status < 600) ? error.status : 500;
    return NextResponse.json({ error: 'Internal server error', details: twErr }, { status: httpStatus });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Send Template API',
    usage: {
      method: 'POST',
      body: {
        to: 'Phone number with country code (e.g., +1234567890)',
        templateName: 'Approved WhatsApp template name',
        languageCode: 'Template language code (e.g., en_US)',
        variables: 'Object with variable names and values { "1": "John", "button0": ["slug"] }',
        saveToDb: 'Boolean (optional, defaults to true)',
        scheduleFor: 'ISO8601 string or timestamp to schedule delivery',
        metadata: 'Arbitrary JSON metadata stored with the message record',
        session: '{ flowToken, waId, contextPatch, lastScreen, lastAction }',
      },
    },
  });
}
