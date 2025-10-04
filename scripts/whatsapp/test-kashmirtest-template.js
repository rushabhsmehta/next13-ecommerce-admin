#!/usr/bin/env node

/**
 * Test Meta WhatsApp Template: kashmirtest
 * Sends to: +919978783238
 */

require('dotenv').config();

const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

const recipientNumber = '919978783238'; // No + prefix for API
const templateName = 'kashmirtest';

console.log('📱 Testing WhatsApp Template: kashmirtest');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Configuration:');
console.log(`  To: +${recipientNumber}`);
console.log(`  Template: ${templateName}`);
console.log(`  Language: en (English)`);
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
        code: 'en' // English
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
      console.log('Full Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('📱 Check your WhatsApp (+919978783238) for the message!');
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
