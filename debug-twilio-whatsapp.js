/**
 * Twilio WhatsApp Configuration Debugger
 * Run this to check your Twilio setup and identify the exact issue
 */

const twilio = require('twilio');

async function debugTwilioWhatsApp() {
  console.log('🔍 === TWILIO WHATSAPP DEBUG START ===');
  
  try {
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'MISSING');
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? `${process.env.TWILIO_AUTH_TOKEN.substring(0, 10)}...` : 'MISSING');
    console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER || 'MISSING');
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials');
    }
    
    // Initialize Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('\n✅ Twilio client initialized successfully');
    
    // Check account details
    console.log('\n📞 Account Information:');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('Account SID:', account.sid);
    console.log('Account Status:', account.status);
    console.log('Account Type:', account.type);
    
    // Check WhatsApp senders (phone numbers)
    console.log('\n📱 WhatsApp Senders:');
    try {
      const senders = await client.messaging.v1.services.list();
      console.log('Messaging Services found:', senders.length);
      
      for (const service of senders) {
        console.log(`Service: ${service.friendlyName} (${service.sid})`);
      }
    } catch (error) {
      console.log('Could not fetch messaging services:', error.message);
    }
    
    // Check phone numbers
    console.log('\n📞 Phone Numbers:');
    try {
      const phoneNumbers = await client.incomingPhoneNumbers.list();
      console.log('Phone numbers found:', phoneNumbers.length);
      
      for (const number of phoneNumbers) {
        console.log(`Number: ${number.phoneNumber} - ${number.friendlyName}`);
        console.log(`  SMS: ${number.capabilities.sms}, Voice: ${number.capabilities.voice}`);
      }
    } catch (error) {
      console.log('Could not fetch phone numbers:', error.message);
    }
    
    // Test API connectivity with a simple call
    console.log('\n🧪 API Connectivity Test:');
    try {
      const messages = await client.messages.list({ limit: 1 });
      console.log('✅ Successfully connected to Twilio Messages API');
      console.log('Recent messages count:', messages.length);
    } catch (error) {
      console.log('❌ Failed to connect to Messages API:', error.message);
      console.log('Error code:', error.code);
      console.log('More info:', error.moreInfo);
    }
    
    // Check WhatsApp-specific configuration
    console.log('\n📲 WhatsApp Configuration:');
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (whatsappNumber) {
      console.log('Configured WhatsApp number:', whatsappNumber);
      
      // Try to validate the number format
      const cleanNumber = whatsappNumber.replace('whatsapp:', '');
      console.log('Clean number:', cleanNumber);
      
      // Check if it's a valid E.164 format
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      console.log('Valid E.164 format:', e164Regex.test(cleanNumber));
    } else {
      console.log('❌ No WhatsApp number configured');
    }
    
    // Provide specific recommendations
    console.log('\n💡 Recommendations:');
    console.log('1. Verify your WhatsApp number is approved in Twilio Console');
    console.log('2. Check WhatsApp Sandbox status: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox');
    console.log('3. Ensure target numbers are in sandbox allowlist (for testing)');
    console.log('4. For production: Submit for WhatsApp Business API approval');
    
  } catch (error) {
    console.error('\n❌ DEBUG ERROR:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
  }
  
  console.log('\n🔍 === TWILIO WHATSAPP DEBUG END ===');
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  debugTwilioWhatsApp().catch(console.error);
}

module.exports = { debugTwilioWhatsApp };
