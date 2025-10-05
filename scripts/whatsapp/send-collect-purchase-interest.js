#!/usr/bin/env node

/**
 * Send collect_purchase_interest Template
 * 
 * Sends the collect_purchase_interest WhatsApp template message
 * that includes a Flow button for testing mobile compatibility
 * 
 * Usage:
 *   node scripts/whatsapp/send-collect-purchase-interest.js <PHONE_NUMBER>
 * 
 * Example:
 *   node scripts/whatsapp/send-collect-purchase-interest.js +919978783238
 */

import 'dotenv/config';

// Get recipient phone number from command line
const recipientPhone = process.argv[2];

if (!recipientPhone) {
  console.error('\n❌ Error: Recipient phone number is required!\n');
  console.log('Usage:');
  console.log('  node scripts/whatsapp/send-collect-purchase-interest.js <PHONE_NUMBER>\n');
  console.log('Example:');
  console.log('  node scripts/whatsapp/send-collect-purchase-interest.js +919978783238\n');
  process.exit(1);
}

const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!phoneNumberId || !accessToken) {
  console.error('\n❌ Error: Missing environment variables!\n');
  console.log('Required:');
  console.log('  META_WHATSAPP_PHONE_NUMBER_ID');
  console.log('  META_WHATSAPP_ACCESS_TOKEN\n');
  process.exit(1);
}

console.log('================================================');
console.log('Sending collect_purchase_interest Template');
console.log('================================================\n');

console.log(`Template Name: collect_purchase_interest`);
console.log(`Language: en (English)`);
console.log(`Recipient: ${recipientPhone}`);
console.log(`Phone Number ID: ${phoneNumberId}\n`);

// Prepare the template message
const messagePayload = {
  messaging_product: 'whatsapp',
  to: recipientPhone.replace(/^\+/, ''), // Remove + prefix for API
  type: 'template',
  template: {
    name: 'collect_purchase_interest',
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
              flow_action_data: {
                flow_token: 'collect-interest-test-' + Date.now()
              }
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
    body: JSON.stringify(messagePayload),
  });

  const responseData = await response.json();

  if (response.ok) {
    console.log('✅ SUCCESS! Message sent successfully!\n');
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (responseData.messages && responseData.messages[0]) {
      const message = responseData.messages[0];
      console.log('\n================================================');
      console.log('Message Details:');
      console.log('================================================');
      console.log(`Message ID: ${message.id}`);
      console.log(`Message Status: ${message.message_status}`);
      console.log(`Recipient: ${recipientPhone}`);
      console.log('\n💡 Tip: Check your WhatsApp to see the message!');
      console.log('📱 Note: Test the "View Flow" button on both mobile and desktop!');
    }
  } else {
    console.error('❌ ERROR! Failed to send message\n');
    console.error('Response:', JSON.stringify(responseData, null, 2));
    
    if (responseData.error) {
      console.error('\nError Details:');
      console.error(`Code: ${responseData.error.code}`);
      console.error(`Message: ${responseData.error.message}`);
      console.error(`Type: ${responseData.error.type}`);
      
      if (responseData.error.error_subcode) {
        console.error(`Subcode: ${responseData.error.error_subcode}`);
      }
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ ERROR! Network request failed\n');
  console.error('Error:', error.message);
  process.exit(1);
}