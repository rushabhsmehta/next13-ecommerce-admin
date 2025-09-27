import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismadb';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const debugEnabled = url.searchParams.get('debug') === '1' || process.env.WHATSAPP_DEBUG === '1';
    const debugEvents: any[] = [];

    const templates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: 'desc' } });

    const payload: any = { success: true, templates, count: templates.length };
    if (debugEnabled) {
      debugEvents.push({ event: 'cloud_removed', message: 'Meta WhatsApp Cloud API templates are no longer queried. Using database templates only.' });
      payload.debug = debugEvents;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
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

