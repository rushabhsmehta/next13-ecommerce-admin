import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import prismadb from '@/lib/prismadb';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function POST(request: NextRequest) {
  try {
    const { to, contentSid, contentVariables } = await request.json();

    if (!to || !contentSid) {
      return NextResponse.json(
        { error: 'Recipient phone number and content SID are required' },
        { status: 400 }
      );
    }

    // Validate Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    // Prepare message data
    const messageData: any = {
      contentSid: contentSid,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    };

    // Add content variables if provided
    if (contentVariables && Object.keys(contentVariables).length > 0) {
      messageData.contentVariables = JSON.stringify(contentVariables);
    }

    console.log('Sending Twilio Content Template:', JSON.stringify(messageData, null, 2));

    // Send message using Twilio
    const message = await client.messages.create(messageData);

    // Save to database
    try {
      await prismadb.whatsAppMessage.create({
        data: {
          messageId: message.sid,
          fromNumber: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}` || '',
          toNumber: `whatsapp:${to}`,
          message: message.body || `[Template: ${contentSid}]`,
          status: message.status,
          timestamp: new Date(),
          direction: 'outgoing',
          mediaUrl: null,
          mediaContentType: null,
        },
      });
    } catch (dbError) {
      console.error('Error saving message to database:', dbError);
      // Continue even if database save fails
    }

    return NextResponse.json({
      success: true,
      message: 'Template message sent successfully',
      twilioResponse: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        price: message.price,
        priceUnit: message.priceUnit
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error sending Twilio template message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send template message',
        details: error?.message || 'Unknown error',
        twilioError: error?.code || null
      },
      { status: 500 }
    );
  }
}
