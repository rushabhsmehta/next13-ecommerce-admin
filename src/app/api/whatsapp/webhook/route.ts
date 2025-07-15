import { NextRequest, NextResponse } from 'next/server';
import { parseIncomingMessage, validateWebhookSignature } from '@/lib/twilio-whatsapp';
import prismadb from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-twilio-signature') || '';
    const url = request.url;

    // Parse form data
    const formData = new URLSearchParams(body);
    const params: { [key: string]: string } = {};
    formData.forEach((value, key) => {
      params[key] = value;
    });

    // Validate webhook signature for security
    if (!validateWebhookSignature(url, params, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the incoming message
    const incomingMessage = parseIncomingMessage(params);
    
    if (!incomingMessage) {
      console.error('Failed to parse incoming message');
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }

    console.log('Received WhatsApp message:', incomingMessage);

    // Store the message in database (you'll need to create this table)
    try {
      await prismadb.whatsAppMessage.create({
        data: {
          messageId: incomingMessage.id,
          fromNumber: incomingMessage.from,
          toNumber: incomingMessage.to,
          message: incomingMessage.body,
          status: incomingMessage.status,
          timestamp: incomingMessage.timestamp,
          mediaUrl: incomingMessage.mediaUrl,
          mediaContentType: incomingMessage.mediaContentType,
          direction: 'incoming'
        }
      });
    } catch (dbError) {
      console.error('Error saving message to database:', dbError);
      // Continue processing even if DB save fails
    }

    // Auto-reply logic (optional)
    if (incomingMessage.body.toLowerCase().includes('hello') || 
        incomingMessage.body.toLowerCase().includes('hi')) {
      
      const { sendWhatsAppMessage } = await import('@/lib/twilio-whatsapp');
      
      try {
        await sendWhatsAppMessage({
          to: incomingMessage.from,
          message: `Hello! Thank you for contacting us. We've received your message: "${incomingMessage.body}". Our team will get back to you soon.`
        });
      } catch (replyError) {
        console.error('Error sending auto-reply:', replyError);
      }
    }

    // Respond to Twilio
    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle status updates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verify = searchParams.get('verify');
    
    // Simple verification endpoint
    if (verify) {
      return NextResponse.json({ status: 'verified' }, { status: 200 });
    }

    return NextResponse.json({ status: 'WhatsApp webhook endpoint is active' }, { status: 200 });
  } catch (error) {
    console.error('Error in webhook GET:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
