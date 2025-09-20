import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp';
import prisma from '@/lib/prismadb';

function normalizeWhatsAppAddress(value: string): string {
  if (!value) return value;
  if (value.startsWith('whatsapp:')) return value;
  const trimmed = value.trim();
  const numeric = trimmed.replace(/[^+\d]/g, '');
  const withPlus = numeric.startsWith('+') ? numeric : `+${numeric}`;
  return `whatsapp:${withPlus}`;
}

function buildContentVariables(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    try {
      const obj = JSON.parse(input);
      if (obj && typeof obj === 'object') return JSON.stringify(obj);
    } catch {
      return JSON.stringify({ 1: input });
    }
    return input;
  }
  if (typeof input === 'object' && input !== null) {
    return JSON.stringify(input as Record<string, unknown>);
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const qpDebug = url.searchParams.get('debug') === '1';
    const { to, templateId, contentSid, templateName, languageCode = 'en_US', variables, saveToDb = true, debug: bodyDebug } = body;
    const debugEnabled = !!bodyDebug || qpDebug || process.env.WHATSAPP_DEBUG === '1';
    const debugEvents: any[] = [];
    if (debugEnabled) {
      const snapshot = { to: typeof to === 'string' ? to : undefined, templateId, contentSid, hasVars: !!variables };
      console.log('[send-template] start', snapshot);
      debugEvents.push({ event: 'start', ...snapshot });
    }

    // Validate required fields
    if (!to || (!templateId && !contentSid)) {
      return NextResponse.json(
        { error: 'Missing required fields: to and templateId|contentSid' },
        { status: 400 }
      );
    }

  // Prefer WhatsApp Cloud template path when name provided (or templateId not Twilio SID)
  const maybeName = templateName || (templateId && !/^H[A-Za-z0-9]+$/.test(String(templateId)) ? String(templateId) : undefined);
  // Validate phone number format (basic validation)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const cleanTo = to.replace('whatsapp:', '');
  if (maybeName) {
      // Build template components from variables
      let bodyParams: Array<string | number> = [];
      let buttonParams: Array<Array<string>> = [];
      if (Array.isArray(variables)) {
        bodyParams = variables.map((v: any) => String(v));
      } else if (variables && typeof variables === 'object') {
        // numeric keys first
        const entries = Object.entries(variables as Record<string, any>);
        const numeric = entries
          .filter(([k]) => /^\d+$/.test(k))
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([, v]) => String(v));
        if (numeric.length) bodyParams = numeric;
        // fallback to keys order
        if (!numeric.length) bodyParams = Object.keys(variables as any).map(k => String((variables as any)[k]));
        // buttons: button0, button1 arrays; or cta_url
        for (let i = 0; i < 3; i++) {
          const btn = (variables as any)[`button${i}`];
          if (Array.isArray(btn)) buttonParams.push(btn.map((v: any) => String(v)));
        }
        if ((variables as any).cta_url) buttonParams.push([String((variables as any).cta_url)]);
      }
      const result = await sendWhatsAppTemplate({ to: cleanTo, templateName: maybeName, languageCode, bodyParams, buttonParams });
      if (result.success) return NextResponse.json({ success: true, messageSid: result.messageSid, status: 'Template message sent successfully' });
      return NextResponse.json({ success: false, error: result.error || 'Send failed' }, { status: 500 });
    }

    // Fallback: send via local DB template (plain text)
    // Fetch template
    const template = await prisma.whatsAppTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Replace variables in template body
    let message = template.body;
    const templateVars = (template.variables as string[]) || [];
    if (templateVars.length > 0 && variables) {
      templateVars.forEach((variable, index) => {
        const placeholderByName = new RegExp(`\{\{${variable}\}\}`, 'g');
        const value = (variables && (variables[variable] ?? variables[index])) ?? `{{${variable}}}`;
        message = message.replace(placeholderByName, String(value));
      });
    }

    if (!phoneRegex.test(cleanTo)) {
      return NextResponse.json({ error: 'Invalid phone number format. Use international format (e.g., +1234567890)' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage({ to: cleanTo, message, saveToDb });
    if (debugEnabled) debugEvents.push({ event: 'local_send_result', success: result.success, sid: result.messageSid });
    if (result.success) {
      const resp: any = { success: true, messageSid: result.messageSid, status: 'Template message sent successfully', template: template.name, processedMessage: message, dbRecord: result.dbRecord };
      if (debugEnabled) resp.debug = debugEvents;
      return NextResponse.json(resp);
    } else {
      const resp: any = { success: false, error: result.error, template: template.name, processedMessage: message, dbRecord: result.dbRecord };
      if (debugEnabled) resp.debug = debugEvents;
      return NextResponse.json(resp, { status: 500 });
    }
  } catch (error: any) {
    const twErr = { message: error?.message || String(error), code: error?.code, status: error?.status, moreInfo: error?.moreInfo, details: error?.details };
    console.error('Error sending template message:', twErr);
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
        templateId: 'UUID of the template to use',
        variables: 'Object with variable names and values { "name": "John", "product": "Widget" }',
        saveToDb: 'Boolean (optional, defaults to true)',
      },
    },
  });
}
