import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';

const CLOUD_API_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v19.0';
const WABA_ID = process.env.WHATSAPP_CLOUD_WABA_ID;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const debugEnabled = url.searchParams.get('debug') === '1' || process.env.WHATSAPP_DEBUG === '1';
    const debugEvents: any[] = [];

    const dbTemplates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: 'desc' } });

    if (!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || !WABA_ID) {
      if (debugEnabled) debugEvents.push({ event: 'cloud_not_configured' });
      return NextResponse.json({ success: true, templates: dbTemplates, count: dbTemplates.length, ...(debugEnabled ? { debug: debugEvents } : {}) });
    }

    const listUrl = `https://graph.facebook.com/${CLOUD_API_VERSION}/${WABA_ID}/message_templates?limit=200&fields=name,language,category,status,components`;
    const res = await fetch(listUrl, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_ACCESS_TOKEN}` } });
    const data = await res.json();
    if (!res.ok) {
      if (debugEnabled) debugEvents.push({ event: 'cloud_list_failed', status: res.status, body: data });
      return NextResponse.json({ success: true, templates: dbTemplates, count: dbTemplates.length, ...(debugEnabled ? { debug: debugEvents } : {}) });
    }

    const templates = (data?.data || []).map((t: any) => {
      const components = t.components || [];
      const body = components.find((c: any) => (c.type || '').toUpperCase() === 'BODY');
      const buttonsComp = components.find((c: any) => (c.type || '').toUpperCase() === 'BUTTONS');
      const bodyText = body?.text || '';
      const variables = Array.from(new Set(String(bodyText).match(/\{\{\d+\}\}/g) || [])).map((m: string) => m.replace(/[^\d]/g, ''));
      const hasCta = !!(buttonsComp && Array.isArray(buttonsComp.buttons) && buttonsComp.buttons.length > 0);
      const buttons = hasCta ? buttonsComp.buttons.map((b: any) => ({
        type: (b.type || b.sub_type || '').toLowerCase(),
        text: b.text,
        url: b.url,
        phone: b.phone_number,
      })) : [];
      return {
        id: t.name,
        name: t.name,
        body: bodyText,
        variables,
        createdAt: new Date().toISOString(),
        status: (t.status || 'unknown').toLowerCase(),
        whatsapp: { hasCta, buttons },
      };
    });

    const payload: any = { success: true, templates, count: templates.length };
    if (debugEnabled) payload.debug = debugEvents;
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching WhatsApp templates (Cloud API):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, body: templateBody, variables } = body;

    if (!name || !templateBody) {
      return NextResponse.json(
        { error: 'Missing required fields: name and body' },
        { status: 400 }
      );
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name,
        body: templateBody,
        variables: variables || [],
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Template name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

