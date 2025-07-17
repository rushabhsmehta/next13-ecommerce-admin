import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    
    // Extract Twilio webhook data
    const messageStatus = {
      MessageSid: params.get('MessageSid'),
      MessageStatus: params.get('MessageStatus'),
      To: params.get('To'),
      From: params.get('From'),
      Body: params.get('Body'),
      NumMedia: params.get('NumMedia'),
      ErrorCode: params.get('ErrorCode'),
      ErrorMessage: params.get('ErrorMessage'),
      AccountSid: params.get('AccountSid'),
      ApiVersion: params.get('ApiVersion'),
      Timestamp: new Date().toISOString()
    };

    console.log('Twilio Webhook Received:', messageStatus);

    // Update message status in database if we have the message
    if (messageStatus.MessageSid) {
      try {
        // Prepare update data - only include fields that exist in schema
        const updateData: any = {
          status: messageStatus.MessageStatus || 'unknown'
        };

        // Only add error fields if they exist and are supported by schema
        if (messageStatus.ErrorCode) {
          try {
            // Try to include error fields, but catch if schema doesn't support them
            updateData.errorCode = messageStatus.ErrorCode;
            updateData.errorMessage = messageStatus.ErrorMessage;
          } catch (schemaError) {
            console.log('Error fields not supported in current schema, skipping...');
          }
        }

        await prismadb.whatsAppMessage.updateMany({
          where: {
            messageId: messageStatus.MessageSid
          },
          data: updateData
        });
        
        console.log(`Updated message ${messageStatus.MessageSid} status to ${messageStatus.MessageStatus}`);
      } catch (dbError) {
        console.error('Error updating message status in database:', dbError);
        // Continue processing even if database update fails
      }
    }

    // Log delivery events for monitoring
    if (messageStatus.MessageStatus === 'delivered') {
      console.log(`✅ WhatsApp message delivered: ${messageStatus.MessageSid} to ${messageStatus.To}`);
    } else if (messageStatus.MessageStatus === 'failed') {
      console.log(`❌ WhatsApp message failed: ${messageStatus.MessageSid} - Error: ${messageStatus.ErrorCode} ${messageStatus.ErrorMessage}`);
    } else if (messageStatus.MessageStatus === 'read') {
      console.log(`👁️ WhatsApp message read: ${messageStatus.MessageSid}`);
    }

    // Respond with TwiML (Twilio expects this)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );

  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    
    // Still return success to Twilio to avoid retries
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Twilio WhatsApp Webhook Endpoint',
    status: 'Active',
    timestamp: new Date().toISOString()
  });
}
