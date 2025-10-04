#!/usr/bin/env node

/**
 * Test Meta WhatsApp Template: hello_world
 * This is Meta's pre-approved sample template
 * Sends to: +919978783238
 */

require('dotenv').config();

const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

const recipientNumber = '919978783238'; // No + prefix for API
const templateName = 'hello_world';

console.log('📱 Testing WhatsApp Template: hello_world');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Configuration:');
console.log(`  To: +${recipientNumber}`);
console.log(`  Template: ${templateName}`);
console.log(`  Language: en_US (English US)`);
console.log(`  Status: ✅ APPROVED`);
console.log(`  Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log(`  API Version: ${API_VERSION}\n`);

async function sendTemplate() {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en_US' // English US
      }
    }
  };

  console.log('📤 Sending request to Meta WhatsApp API...\n');
  console.log('Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('📥 Response:');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (response.ok && data.messages) {
      console.log('✅ SUCCESS! Template message sent!\n');
      console.log('Message Details:');
      console.log(`  Message ID: ${data.messages[0].id}`);
      console.log(`  Status: Sent`);
      console.log(`  Recipient: +${recipientNumber}`);
      console.log('');
      console.log('Template Content:');
      console.log('  ┌─────────────────────────────────────────────────────┐');
      console.log('  │ Hello World                                         │');
      console.log('  │                                                     │');
      console.log('  │ Welcome and congratulations!! This message          │');
      console.log('  │ demonstrates your ability to send a WhatsApp        │');
      console.log('  │ message notification from the Cloud API, hosted     │');
      console.log('  │ by Meta. Thank you for taking the time to test      │');
      console.log('  │ with us.                                            │');
      console.log('  │                                                     │');
      console.log('  │ WhatsApp Business Platform sample message           │');
      console.log('  └─────────────────────────────────────────────────────┘');
      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('🎉 CONGRATULATIONS!');
      console.log('📱 Check your WhatsApp (+919978783238) for the message!');
      console.log('   Your Meta WhatsApp integration is working perfectly!');
    } else {
      console.log('❌ FAILED to send template\n');
      console.log('Error Details:');
      if (data.error) {
        console.log(`  Code: ${data.error.code}`);
        console.log(`  Message: ${data.error.message}`);
        console.log(`  Type: ${data.error.type}`);
        if (data.error.error_data) {
          console.log(`  Details: ${data.error.error_data.details}`);
        }
      }
      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.log('❌ ERROR during request:');
    console.log(error.message);
    console.log('');
    console.log('Stack trace:');
    console.log(error.stack);
  }
}

// Check configuration first
if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.log('❌ Missing required environment variables!');
  console.log('');
  console.log('Please ensure these are set in your .env file:');
  console.log('  META_WHATSAPP_PHONE_NUMBER_ID');
  console.log('  META_WHATSAPP_ACCESS_TOKEN');
  process.exit(1);
}

// Send the template
sendTemplate();
