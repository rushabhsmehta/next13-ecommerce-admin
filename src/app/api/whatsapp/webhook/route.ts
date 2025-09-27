import { NextResponse } from 'next/server';

export async function GET() {
  return new NextResponse('WhatsApp Cloud webhook disabled', { status: 410 });
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'Incoming webhooks via WhatsApp Cloud API are no longer supported.',
    },
    { status: 410 }
  );
}
