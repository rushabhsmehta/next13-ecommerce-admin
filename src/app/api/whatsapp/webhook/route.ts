import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      if (contentType.includes('application/x-www-form-urlencoded')) {
        body = Object.fromEntries(new URLSearchParams(text));
      } else {
        body = text;
      }
    }

    const headers: Record<string, string> = {};
    for (const [k, v] of Array.from(request.headers.entries())) headers[k] = v;

    console.log('[WhatsApp webhook] headers:', headers);
    console.log('[WhatsApp webhook] body:', body);

    // For now just return 200 quickly; you can later route this to your message processor
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp webhook] error handling request:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}