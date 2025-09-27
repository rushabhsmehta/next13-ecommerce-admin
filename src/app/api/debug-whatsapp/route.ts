import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'WhatsApp debugging via Twilio has been removed. Use AiSensy monitoring tools instead.',
    },
    { status: 410 }
  );
}
