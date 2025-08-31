import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppMessages } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const messages = await getWhatsAppMessages(limit);

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error('Error fetching WhatsApp messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
