import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const formData = new URLSearchParams(body);
    
    const messageSid = formData.get('MessageSid');
    const messageStatus = formData.get('MessageStatus');
    const timestamp = new Date();
    
    console.log('Message status update:', {
      messageSid,
      messageStatus,
      timestamp
    });

    // Update message status in database
    if (messageSid && messageStatus) {
      try {
        await prismadb.whatsAppMessage.updateMany({
          where: {
            messageId: messageSid
          },
          data: {
            status: messageStatus,
            timestamp: timestamp
          }
        });
      } catch (dbError) {
        console.error('Error updating message status in database:', dbError);
      }
    }
    
    return new NextResponse('Status update received', { status: 200 });
  } catch (error) {
    console.error('Error in status webhook:', error);
    return NextResponse.json({ error: 'Status webhook error' }, { status: 500 });
  }
}
