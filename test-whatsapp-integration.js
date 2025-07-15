/*
 * WhatsApp Integration Test Script
 * 
 * To use this script:
 * 1. Set the TEST_PHONE_NUMBER environment variable, or
 * 2. Update the testPhoneNumber variable below with your phone number
 * 
 * Run with: node test-whatsapp-integration.js
 */

const { sendWhatsAppMessage } = require('./src/lib/twilio-whatsapp');

async function testWhatsAppIntegration() {
  console.log('🚀 Testing WhatsApp Integration...\n');

  try {
    // Test sending a message (update the phone number below before running)
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+919876543210'; // Update this number
    console.log('1. Testing message sending...');
    const result = await sendWhatsAppMessage({
      to: testPhoneNumber,
      message: '🎉 WhatsApp integration test successful! Your Twilio WhatsApp Business API is working correctly.'
    });

    console.log('✅ Message sent successfully!');
    console.log('📋 Message Details:');
    console.log(`   - Message ID: ${result.id}`);
    console.log(`   - Status: ${result.status}`);
    console.log(`   - To: ${result.to}`);
    console.log(`   - From: ${result.from}`);
    console.log(`   - Timestamp: ${result.timestamp}`);

    // Test with image (optional)
    console.log('\n2. Testing image message...');
    const imageResult = await sendWhatsAppMessage({
      to: testPhoneNumber,
      message: '📸 Test image with WhatsApp Business API',
      mediaUrl: 'https://via.placeholder.com/300x200.png?text=WhatsApp+Test'
    });

    console.log('✅ Image message sent successfully!');
    console.log(`   - Message ID: ${imageResult.id}`);

    console.log('\n🎯 Integration test completed successfully!');
    console.log('🌐 You can now access the WhatsApp dashboard at: /whatsapp');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your environment variables in .env.local');
    console.log('2. Verify Twilio credentials');
    console.log('3. Ensure phone numbers are in international format');
    console.log('4. Check Twilio account balance');
    console.log('5. Verify WhatsApp is enabled in Twilio Console');
  }
}

// Run the test
testWhatsAppIntegration();
