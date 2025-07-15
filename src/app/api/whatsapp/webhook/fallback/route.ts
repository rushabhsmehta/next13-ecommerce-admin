import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('Fallback webhook triggered:', body);
    
    // Log the fallback for monitoring
    console.error('Primary webhook failed, fallback triggered');
    
    return new NextResponse('Fallback OK', { status: 200 });
  } catch (error) {
    console.error('Error in fallback webhook:', error);
    return NextResponse.json({ error: 'Fallback webhook error' }, { status: 500 });
  }
}
