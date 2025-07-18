import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import prisma from '@/lib/prismadb';

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

    // Validate phone number format (should include country code)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number format', 
          details: 'Phone number must include country code (e.g., +1234567890)',
          received: to
        },
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

    // Validate WhatsApp sender number
    if (!process.env.TWILIO_WHATSAPP_NUMBER) {
      return NextResponse.json(
        { 
          error: 'Twilio WhatsApp number not configured', 
          details: 'Please set TWILIO_WHATSAPP_NUMBER in your environment variables'
        },
        { status: 500 }
      );
    }
 
    // Prepare message data
    const whatsappFromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const whatsappToNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    console.log('Environment Debug:', {
      originalTo: to,
      envWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      whatsappFromNumber,
      whatsappToNumber
    });
    
    const messageData: any = {
      contentSid: contentSid,
      from: whatsappFromNumber, // Already includes 'whatsapp:' prefix from env
      to: whatsappToNumber,
    };

    // Add content variables if provided
    if (contentVariables && Object.keys(contentVariables).length > 0) {
      messageData.contentVariables = JSON.stringify(contentVariables);
    }

    console.log('Sending Twilio Content Template:', JSON.stringify(messageData, null, 2));

    // Send message using Twilio
    const message = await client.messages.create(messageData);

    console.log('Twilio Response:', {
      sid: message.sid,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      to: message.to,
      from: message.from,
      price: message.price,
      priceUnit: message.priceUnit,
      dateCreated: message.dateCreated
    });

    // Check if message failed
    if (message.status === 'failed' || message.errorCode) {
      console.error('Twilio message failed:', {
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        status: message.status
      });
      
      return NextResponse.json({
        success: false,
        error: 'Message failed to send',
        details: message.errorMessage || 'Unknown Twilio error',
        twilioErrorCode: message.errorCode,
        status: message.status
      }, { status: 400 });
    }

    // Save to database
    try {
      await (prisma as any).whatsAppMessage.create({
        data: {
          messageId: message.sid,
          messageSid: message.sid, // Add this field
          fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
          toNumber: whatsappToNumber,
          message: message.body || `[Template: ${contentSid}]`,
          status: message.status,
          timestamp: new Date(),
          direction: 'outgoing',
          mediaUrl: null,
          mediaContentType: null,
          contentSid: contentSid, // Link to template
          contentVars: contentVariables ? JSON.parse(JSON.stringify(contentVariables)) : null,
        },
      });
      
      console.log('✅ Message saved to database successfully');
    } catch (dbError) {
      console.error('❌ Error saving message to database:', dbError);
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
