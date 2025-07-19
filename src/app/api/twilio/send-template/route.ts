import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio-whatsapp';
import prisma from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  console.log('🚀 === SEND-TEMPLATE API START ===');
  
  try {
    console.log('📥 Request received at:', new Date().toISOString());
    console.log('📡 Request method:', request.method);
    console.log('🌐 Request URL:', request.url);
    console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()));
    
    const requestBody = await request.json();
    console.log('📦 Raw request body:', requestBody);
    
    const { to, contentSid, contentVariables, templateName, body, mediaUrl } = requestBody;

    console.log('� Parsed request data:');
    console.log('  - to:', to, `(type: ${typeof to})`);
    console.log('  - contentSid:', contentSid, `(type: ${typeof contentSid})`);
    console.log('  - contentVariables:', contentVariables, `(type: ${typeof contentVariables})`);
    console.log('  - templateName:', templateName, `(type: ${typeof templateName})`);
    console.log('  - body:', body, `(type: ${typeof body})`);
    console.log('  - mediaUrl:', mediaUrl, `(type: ${typeof mediaUrl})`);

    if (!to) {
      console.log('❌ Validation failed: Missing recipient phone number');
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format (should include country code)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(to)) {
      console.log('❌ Validation failed: Invalid phone number format');
      console.log('  - Received:', to);
      console.log('  - Expected format: +1234567890 (with country code)');
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
    console.log('🔐 Checking Twilio credentials...');
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    console.log('  - TWILIO_ACCOUNT_SID:', twilioSid ? `${twilioSid.substring(0, 10)}...` : 'MISSING');
    console.log('  - TWILIO_AUTH_TOKEN:', twilioToken ? `${twilioToken.substring(0, 10)}...` : 'MISSING');
    console.log('  - TWILIO_WHATSAPP_NUMBER:', twilioNumber || 'MISSING');
    
    if (!twilioSid || !twilioToken) {
      console.log('❌ Twilio credentials not configured');
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    if (!twilioNumber) {
      console.log('❌ Twilio WhatsApp number not configured');
      return NextResponse.json(
        { 
          error: 'Twilio WhatsApp number not configured', 
          details: 'Please set TWILIO_WHATSAPP_NUMBER in your environment variables'
        },
        { status: 500 }
      );
    }

    console.log('� Building message options...');
    
    // Prepare message options based on guide's recommendations
    const messageOptions: any = {
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    };
    
    console.log('🎯 Initial message options:', messageOptions);

    // Handle different message types as per guide
    if (contentSid) {
      console.log('📄 Processing template message with contentSid:', contentSid);
      // Template message with Content SID (recommended approach)
      messageOptions.contentSid = contentSid;
      
      // Clean up content variables - remove empty string values
      if (contentVariables && typeof contentVariables === 'object') {
        console.log('🧹 Cleaning content variables...');
        console.log('  - Raw contentVariables:', contentVariables);
        
        const cleanedVars: any = {};
        Object.keys(contentVariables).forEach(key => {
          const value = contentVariables[key];
          console.log(`  - Variable "${key}": "${value}" (${typeof value})`);
          // Only include non-empty string values
          if (value && value.trim() !== '') {
            cleanedVars[key] = value;
            console.log(`    ✅ Included: "${key}" = "${value}"`);
          } else {
            console.log(`    ❌ Excluded empty: "${key}" = "${value}"`);
          }
        });
        
        // Only set contentVars if we have actual values
        if (Object.keys(cleanedVars).length > 0) {
          messageOptions.contentVars = cleanedVars;
          console.log('✅ Final cleaned content variables:', cleanedVars);
        } else {
          console.log('⚠️ No valid content variables provided, sending template without variables');
        }
      } else {
        console.log('📋 No contentVariables provided or invalid format');
      }
    } else if (body) {
      // Regular text message (must be within 24-hour window)
      console.log('📝 Processing regular text message');
      messageOptions.body = body;
      if (mediaUrl) {
        console.log('🖼️ Adding media URL:', mediaUrl);
        messageOptions.mediaUrl = mediaUrl;
      }
    } else {
      console.log('❌ Neither contentSid nor body provided');
      return NextResponse.json(
        { error: 'Either contentSid or body must be provided' },
        { status: 400 }
      );
    }

    console.log('📤 Final message options to send:', messageOptions);
    console.log('🚀 Calling sendWhatsAppMessage helper...');

    // Send the message using our helper function
    const sentMessage = await sendWhatsAppMessage(messageOptions);
    
    console.log('📥 Helper function response:', sentMessage);

    // Check if message sending failed
    if (!sentMessage.success) {
      console.error('❌ Message sending failed');
      console.error('  - Error:', sentMessage.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to send WhatsApp message',
        details: sentMessage.error,
        debugInfo: {
          to: messageOptions.to,
          hasContentSid: !!messageOptions.contentSid,
          hasContentVars: !!messageOptions.contentVars,
          hasBody: !!messageOptions.body
        }
      }, { status: 500 });
    }

    console.log('✅ Message sent successfully!');
    console.log('  - Message SID:', sentMessage.messageId);
    console.log('  - Status:', sentMessage.status);

    // Save outgoing message to database following guide's recommendations
    console.log('💾 Saving message to database...');
    try {
      const dbData = {
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
        contentVars: messageOptions.contentVars || null,
      };
      
      console.log('📋 Database data to save:', dbData);
      
      await (prisma as any).whatsAppMessage.create({
        data: dbData
      });
      
      console.log('✅ Message saved to database successfully');
    } catch (dbError) {
      console.error('❌ Error saving message to database:', dbError);
      console.error('Database error details:', dbError instanceof Error ? dbError.message : 'Unknown error');
      // Don't fail the API call if database save fails
    }

    // Return success response
    const successResponse = {
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
    };
    
    console.log('📤 Sending success response:', successResponse);
    console.log('🏁 === SEND-TEMPLATE API SUCCESS ===');
    
    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('💥 === SEND-TEMPLATE API ERROR ===');
    console.error('Error occurred:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Provide detailed error information for debugging
    let errorMessage = 'Failed to send WhatsApp message';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Check for common Twilio errors
      if (error.message.includes('Authentication Error') || error.message.includes('authentication')) {
        errorMessage = 'Twilio authentication failed';
        errorDetails = 'Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN';
        console.error('🔐 Authentication error detected');
      } else if (error.message.includes('Invalid phone number') || error.message.includes('phone')) {
        errorMessage = 'Invalid phone number format';
        console.error('📱 Phone number error detected');
      } else if (error.message.includes('content') || error.message.includes('template')) {
        errorMessage = 'Template content error';
        errorDetails = `Template issue: ${error.message}`;
        console.error('📄 Template content error detected');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'Network connectivity error';
        errorDetails = 'Please check your internet connection and try again';
        console.error('🌐 Network error detected');
      }
    }
    
    const errorResponse = {
      success: false,
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      debugInfo: {
        errorType: error?.constructor?.name || 'Unknown',
        originalMessage: error instanceof Error ? error.message : 'No error message'
      }
    };
    
    console.error('📤 Sending error response:', errorResponse);
    console.error('🏁 === SEND-TEMPLATE API ERROR END ===');
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
