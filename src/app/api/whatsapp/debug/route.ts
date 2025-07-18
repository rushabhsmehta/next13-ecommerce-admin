import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import prisma from '@/lib/prismadb';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function GET(request: NextRequest) {
  try {
    // Check if Twilio credentials are configured
    const credentialsCheck = {
      twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
      actualWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      hasCorrectFormat: process.env.TWILIO_WHATSAPP_NUMBER?.startsWith('whatsapp:') || false
    };

    // Get recent messages to check delivery status
    let recentMessages: any[] = [];
    try {
      const messages = await client.messages.list({ limit: 10 });
      recentMessages = messages.map(message => ({
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        direction: message.direction,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit
      }));
    } catch (messageError) {
      console.error('Error fetching recent messages:', messageError);
    }

    // Check WhatsApp sender status
    let senderStatus = null;
    try {
      if (process.env.TWILIO_WHATSAPP_NUMBER) {
        const phoneNumbers = await client.incomingPhoneNumbers.list();
        const whatsappNumber = phoneNumbers.find(num => 
          num.phoneNumber === process.env.TWILIO_WHATSAPP_NUMBER
        );
        
        if (whatsappNumber) {
          senderStatus = {
            phoneNumber: whatsappNumber.phoneNumber,
            status: whatsappNumber.status,
            capabilities: whatsappNumber.capabilities
          };
        }
      }
    } catch (senderError) {
      console.error('Error checking sender status:', senderError);
    }

    // Check content templates
    let contentTemplates: any[] = [];
    try {
      const templates = await client.content.v1.contents.list({ limit: 10 });
      contentTemplates = templates.map(template => ({
        sid: template.sid,
        friendlyName: template.friendlyName,
        language: template.language,
        types: Object.keys(template.types || {}),
        dateCreated: template.dateCreated,
        dateUpdated: template.dateUpdated
      }));
    } catch (templateError) {
      console.error('Error fetching templates:', templateError);
    }

    // Check database messages
    let databaseMessages: any[] = [];
    try {
      databaseMessages = await (prisma as any).whatsAppMessage.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          messageId: true,
          messageSid: true,
          fromNumber: true,
          toNumber: true,
          message: true,
          status: true,
          direction: true,
          timestamp: true,
          contentSid: true,
          templateName: true
        }
      });
    } catch (dbError) {
      console.error('Error fetching database messages:', dbError);
    }

    return NextResponse.json({
      success: true,
      debug: {
        credentials: credentialsCheck,
        recentMessages,
        databaseMessages,
        senderStatus,
        contentTemplates,
        webhookUrls: {
          whatsappWebhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
          twilioWebhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/twilio/webhook`,
          note: 'Configure these URLs in your Twilio Console for webhook notifications'
        },
        recommendations: generateRecommendations(recentMessages, credentialsCheck, databaseMessages)
      }
    });

  } catch (error: any) {
    console.error('Error in WhatsApp debug:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get debug information',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(recentMessages: any[], credentials: any, databaseMessages: any[]): string[] {
  const recommendations = [];

  // Check credentials
  if (!credentials.twilioAccountSid || !credentials.twilioAuthToken) {
    recommendations.push('❌ Twilio credentials are missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
  }

  if (!credentials.twilioWhatsappNumber) {
    recommendations.push('❌ Twilio WhatsApp number is missing. Set TWILIO_WHATSAPP_NUMBER in environment variables.');
  } else {
    // Check WhatsApp number format
    const whatsappNumber = credentials.actualWhatsappNumber;
    if (whatsappNumber && !whatsappNumber.startsWith('whatsapp:')) {
      recommendations.push('❌ Invalid WhatsApp number format! Use "whatsapp:+[country_code][number]" format (e.g., "whatsapp:+919898744701").');
      recommendations.push('🔧 Current format: ' + whatsappNumber + ' → Should be: whatsapp:' + whatsappNumber);
    }
  }

  // Check recent message failures
  const failedMessages = recentMessages.filter(msg => msg.status === 'failed');
  if (failedMessages.length > 0) {
    recommendations.push(`⚠️ ${failedMessages.length} recent messages failed. Check error codes in the debug info.`);
    
    const commonErrors = failedMessages.reduce((acc, msg) => {
      if (msg.errorCode) {
        acc[msg.errorCode] = (acc[msg.errorCode] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    Object.entries(commonErrors).forEach(([code, count]) => {
      if (code === '21212') {
        recommendations.push(`🔍 Error ${code}: Invalid 'From' Number - This is usually caused by incorrect WhatsApp number format. Make sure to use "whatsapp:+[number]" format.`);
      } else {
        recommendations.push(`🔍 Error ${code} occurred ${count} times. Check Twilio documentation for this error code.`);
      }
    });
  }

  // Check message status patterns
  const undeliveredMessages = recentMessages.filter(msg => 
    msg.status === 'sent' || msg.status === 'queued'
  );
  if (undeliveredMessages.length > 5) {
    recommendations.push('⚠️ Many messages are stuck in "sent" or "queued" status. This may indicate delivery issues.');
  }

  // Check database message recording
  if (databaseMessages.length === 0) {
    recommendations.push('❌ No messages found in database. Messages are not being recorded properly.');
    recommendations.push('🔧 Check if send-template route is saving messages to database.');
  } else {
    const outgoingMessages = databaseMessages.filter(msg => msg.direction === 'outgoing');
    const incomingMessages = databaseMessages.filter(msg => msg.direction === 'incoming');
    
    if (outgoingMessages.length === 0) {
      recommendations.push('⚠️ No outgoing messages recorded in database.');
    }
    
    if (incomingMessages.length === 0) {
      recommendations.push('⚠️ No incoming messages recorded in database. Check webhook configuration.');
      recommendations.push('🔧 Webhook URLs should be configured in Twilio Console.');
    }
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('✅ Configuration looks good. If messages still aren\'t being delivered:');
    recommendations.push('1. Ensure the recipient has WhatsApp installed and the number is correct');
    recommendations.push('2. Check if the template is approved for WhatsApp Business');
    recommendations.push('3. Verify the sender phone number is properly configured in Twilio');
    recommendations.push('4. Check Twilio logs for detailed error information');
  }

  return recommendations;
}
