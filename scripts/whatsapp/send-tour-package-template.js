/**
 * Send Tour Package Marketing Template
 * 
 * Sends the tour_package_marketing WhatsApp template message
 * using Meta WhatsApp Business API
 * 
 * Usage:
 *   node scripts/whatsapp/send-tour-package-template.js <PHONE_NUMBER>
 * 
 * Example:
 *   node scripts/whatsapp/send-tour-package-template.js +919724444701
 * 
 * Prerequisites:
 *   - Template must be approved in Meta Business Manager
 *   - META_WHATSAPP_ACCESS_TOKEN in .env
 *   - META_WHATSAPP_PHONE_NUMBER_ID in .env
 */

import 'dotenv/config';

// Get recipient phone number from command line
const recipientPhone = process.argv[2];

if (!recipientPhone) {
  console.error('\n❌ Error: Recipient phone number is required!\n');
  console.log('Usage:');
  console.log('  node scripts/whatsapp/send-tour-package-template.js <PHONE_NUMBER>\n');
  console.log('Example:');
  console.log('  node scripts/whatsapp/send-tour-package-template.js +919724444701\n');
  process.exit(1);
}

// Validate phone number format (should start with +)
if (!recipientPhone.startsWith('+')) {
  console.error('\n❌ Error: Phone number must include country code starting with +\n');
  console.log('Example: +919724444701 (for India)\n');
  process.exit(1);
}

// Get environment variables
const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!accessToken || !phoneNumberId) {
  console.error('\n❌ Error: Missing environment variables!\n');
  console.error('Required:');
  console.error('  - META_WHATSAPP_ACCESS_TOKEN');
  console.error('  - META_WHATSAPP_PHONE_NUMBER_ID\n');
  process.exit(1);
}

console.log('\n================================================');
console.log('Sending Tour Package Marketing Template');
console.log('================================================\n');

console.log(`Template Name: tour_package_marketing`);
console.log(`Language: en (English)`);
console.log(`Recipient: ${recipientPhone}`);
console.log(`Phone Number ID: ${phoneNumberId}\n`);

// Prepare the template message
// This template likely has a Flow button that opens the WhatsApp Flow
const messagePayload = {
  messaging_product: 'whatsapp',
  to: recipientPhone,
  type: 'template',
  template: {
    name: 'tour_package_marketing',
    language: {
      code: 'en'
    },
    components: [
      {
        type: 'button',
        sub_type: 'flow',
        index: '0',
        parameters: [
          {
            type: 'action',
            action: {
              flow_action_data: {}
            }
          }
        ]
      }
    ]
  }
};

// Send the message
const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

console.log('Sending message...\n');

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messagePayload)
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ SUCCESS! Message sent successfully!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n================================================');
    console.log('Message Details:');
    console.log('================================================');
    console.log(`Message ID: ${data.messages[0].id}`);
    console.log(`Message Status: ${data.messages[0].message_status || 'sent'}`);
    console.log(`Recipient: ${recipientPhone}`);
    console.log('\n💡 Tip: Check your WhatsApp to see the message!\n');
  } else {
    console.error('❌ Error sending message:\n');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', JSON.stringify(data, null, 2));
    
    console.error('\n📋 Common Issues:');
    console.error('─'.repeat(50));
    
    if (data.error?.code === 131026) {
      console.error('❌ Template not found or not approved');
      console.error('   → Check template status in Meta Business Manager');
      console.error('   → Template name: tour_package_marketing');
      console.error('   → Language: en (English)');
    } else if (data.error?.code === 131047) {
      console.error('❌ Template parameters mismatch');
      console.error('   → Check if template has variables {{1}}, {{2}}, etc.');
      console.error('   → Update the components array in this script');
    } else if (data.error?.code === 131051) {
      console.error('❌ Invalid phone number or not on WhatsApp');
      console.error('   → Make sure phone number is correct');
      console.error('   → Verify recipient has WhatsApp installed');
    } else if (data.error?.code === 100) {
      console.error('❌ Invalid access token or permissions');
      console.error('   → Check META_WHATSAPP_ACCESS_TOKEN in .env');
    }
    
    console.error('\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Network Error:', error.message);
  console.error('\nMake sure:');
  console.error('- You have internet connection');
  console.error('- META_WHATSAPP_ACCESS_TOKEN is valid');
  console.error('- META_WHATSAPP_PHONE_NUMBER_ID is correct\n');
  process.exit(1);
}
