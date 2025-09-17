#!/usr/bin/env node

/**
 * Send WhatsApp template message directly via Twilio
 * This bypasses the database and uses Twilio Content API directly
 */

const twilio = require('twilio');
require('dotenv').config();

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.log('❌ Twilio credentials not found in .env file');
  process.exit(1);
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendTemplateDirectly() {
  try {
    console.log('📱 Sending WhatsApp template message directly via Twilio...\n');
    
    const templateSid = 'HXa7cdcad4a90c1f0f98790f17882deeb2';
    const toNumber = '+919978783238';
    
    console.log(`📋 Template SID: ${templateSid}`);
    console.log(`📞 To: ${toNumber}`);
    console.log(`📝 Template: aagam_marketing_hxa7cdcad4a90c1f0f98790f17882deeb2\n`);
    
    // Method 1: Send using Content Template
    console.log('🚀 Attempting to send via Content Template...');
    
    const message = await client.messages.create({
      contentSid: templateSid,
      from: 'whatsapp:+919898744701', // Your Twilio WhatsApp number
      to: `whatsapp:${toNumber}`,
    });
    
    console.log('✅ SUCCESS! Message sent successfully:');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    
    if (message.errorCode) {
      console.log(`   Error Code: ${message.errorCode}`);
      console.log(`   Error Message: ${message.errorMessage}`);
    }
    
    console.log('\n🎉 Template message sent successfully to +919978783238!');
    console.log('📱 Check your WhatsApp to see the aagam_marketing message.');
    
    return message;
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    
    if (error.moreInfo) {
      console.error(`More Info: ${error.moreInfo}`);
    }
    
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Make sure your Twilio WhatsApp number is correctly configured');
    console.log('2. Verify that the template is approved for use');
    console.log('3. Check if your Twilio account has WhatsApp messaging enabled');
    console.log('4. Ensure the recipient number has opted in to receive WhatsApp messages');
    
    throw error;
  }
}

// Run the script
if (require.main === module) {
  sendTemplateDirectly()
    .then((result) => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { sendTemplateDirectly };