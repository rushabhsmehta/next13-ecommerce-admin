// Test script for WhatsApp functionality
// Run with: node test-whatsapp.js

const fetch = require('node-fetch');

async function testWhatsAppAPI() {
  console.log('🧪 Testing WhatsApp API functionality...\n');

  // Test 1: Check API endpoints
  console.log('1. Testing API endpoints...');

  try {
    // Test send endpoint (GET should return usage info)
    const sendResponse = await fetch('http://localhost:3000/api/whatsapp/send');
    const sendData = await sendResponse.json();
    console.log('✅ Send endpoint:', sendData.message);

    // Test messages endpoint
    const messagesResponse = await fetch('http://localhost:3000/api/whatsapp/messages');
    const messagesData = await messagesResponse.json();
    console.log('✅ Messages endpoint: Found', messagesData.count || 0, 'messages');

    // Test webhook endpoint
    const webhookResponse = await fetch('http://localhost:3000/api/whatsapp/webhook');
    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook endpoint:', webhookData.message);

  } catch (error) {
    console.log('❌ API endpoint test failed:', error.message);
  }

  // Test 2: Try to send a test message (commented out to avoid actual sending)
  console.log('\n2. Test message sending (commented out)...');
  console.log('   To test sending, uncomment the code below and provide a valid phone number');

  /*
  try {
    const testMessage = {
      to: '+919978783238', // Replace with a valid WhatsApp number
      message: 'Test message from WhatsApp Business API'
    };

    const sendMessageResponse = await fetch('http://localhost:3000/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    const result = await sendMessageResponse.json();

    if (result.success) {
      console.log('✅ Message sent successfully!');
      console.log('   Message SID:', result.messageSid);
    } else {
      console.log('❌ Failed to send message:', result.error);
    }
  } catch (error) {
    console.log('❌ Message sending test failed:', error.message);
  }
  */

  console.log('\n🎉 WhatsApp API test completed!');
  console.log('📱 Access the WhatsApp settings page at: https://admin.aagamholidays.com/settings/whatsapp');
}

testWhatsAppAPI().catch(console.error);
