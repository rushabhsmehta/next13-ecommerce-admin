import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Read raw body for full visibility (Twilio posts form-encoded data sometimes)
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      // Try parsing urlencoded form data into an object for easier reading
      if (contentType.includes('application/x-www-form-urlencoded')) {
        body = Object.fromEntries(new URLSearchParams(text));
      } else {
        body = text;
      }
    }

    // Log headers and body so you can inspect Twilio requests in server logs
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => {
      headers[k] = v;
    });

    console.log('[WhatsApp status-callback] headers:', headers);
    console.log('[WhatsApp status-callback] body:', body);

    // Return quick 200 OK to Twilio
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[WhatsApp status-callback] error handling request:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
