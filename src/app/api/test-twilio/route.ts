import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing Twilio WhatsApp Sandbox');
    
    // Check environment
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    console.log('Environment check:');
    console.log('- TWILIO_ACCOUNT_SID:', twilioSid ? 'Present' : 'Missing');
    console.log('- TWILIO_AUTH_TOKEN:', twilioToken ? 'Present' : 'Missing');
    console.log('- TWILIO_WHATSAPP_NUMBER:', twilioNumber);
    
    if (!twilioSid || !twilioToken || !twilioNumber) {
      return NextResponse.json({
        success: false,
        error: 'Missing Twilio configuration',
        details: {
          hasSid: !!twilioSid,
          hasToken: !!twilioToken,
          hasNumber: !!twilioNumber,
          number: twilioNumber
        }
      }, { status: 500 });
    }
    
    // Import Twilio
    const twilio = require('twilio');
    const client = twilio(twilioSid, twilioToken);
    
    // Test API connectivity
    const account = await client.api.accounts(twilioSid).fetch();
    console.log('Account status:', account.status);
    
    // Check for phone numbers
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    console.log('Phone numbers found:', phoneNumbers.length);
    
    // Try to send a test message to a known working number (sandbox)
    // This is just a connectivity test, not actually sending
    const testResult = {
      accountStatus: account.status,
      phoneNumbersCount: phoneNumbers.length,
      configuredNumber: twilioNumber,
      recommendations: []
    };
    
    if (phoneNumbers.length === 0) {
      testResult.recommendations.push('No phone numbers found - use WhatsApp Sandbox for testing');
      testResult.recommendations.push('Go to: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Twilio configuration test completed',
      data: testResult
    });
    
  } catch (error) {
    console.error('Twilio test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Twilio test failed',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        status: (error as any)?.status
      }
    }, { status: 500 });
  }
}
