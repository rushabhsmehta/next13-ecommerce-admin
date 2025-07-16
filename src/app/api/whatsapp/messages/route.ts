import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppMessages } from '@/lib/twilio-whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getWhatsAppMessages(limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in WhatsApp messages API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
