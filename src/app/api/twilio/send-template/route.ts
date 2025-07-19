import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio-whatsapp';
import prisma from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const { to, contentSid, contentVariables, templateName, body, mediaUrl } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
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

    console.log('📤 Sending WhatsApp message:', { 
      to, 
      hasContentSid: !!contentSid, 
      hasBody: !!body,
      hasMedia: !!mediaUrl,
      templateName 
    });

    // Prepare message options based on guide's recommendations
    const messageOptions: any = {
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    };

    // Handle different message types as per guide
    if (contentSid) {
      // Template message with Content SID (recommended approach)
      messageOptions.contentSid = contentSid;
      if (contentVariables) {
        messageOptions.contentVars = contentVariables;
      }
    } else if (body) {
      // Regular text message (must be within 24-hour window)
      messageOptions.body = body;
      if (mediaUrl) {
        messageOptions.mediaUrl = mediaUrl;
      }
    } else {
      return NextResponse.json(
        { error: 'Either contentSid or body must be provided' },
        { status: 400 }
      );
    }

    // Send the message using our helper function
    const sentMessage = await sendWhatsAppMessage(messageOptions);

    // Check if message sending failed
    if (!sentMessage.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send WhatsApp message',
        details: sentMessage.error
      }, { status: 500 });
    }

    // Save outgoing message to database following guide's recommendations
    try {
      await (prisma as any).whatsAppMessage.create({
        data: {
          messageId: sentMessage.messageId,
          messageSid: sentMessage.messageId,
          fromNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
          toNumber: messageOptions.to,
          message: (sentMessage as any).body || `[Template: ${templateName || contentSid}]`,
          status: sentMessage.status,
          timestamp: new Date(),
          direction: 'outgoing',
          mediaUrl: mediaUrl || null,
          mediaContentType: null,
          contentSid: contentSid,
          templateName: templateName,
          contentVars: contentVariables || null,
        },
      });
      
      console.log('✅ Outgoing message saved to database');
    } catch (dbError) {
      console.error('❌ Error saving message to database:', dbError);
      // Don't fail the API call if database save fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: {
        sid: sentMessage.messageId,
        status: sentMessage.status,
        to: (sentMessage as any).to,
        from: (sentMessage as any).from,
        dateCreated: (sentMessage as any).dateCreated,
        price: (sentMessage as any).price,
        priceUnit: (sentMessage as any).priceUnit,
        contentSid: contentSid,
        templateName: templateName
      }
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send WhatsApp message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
