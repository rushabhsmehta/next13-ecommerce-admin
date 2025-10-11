#!/usr/bin/env node

/**
 * Send Free-form Text Message via WhatsApp
 * 
 * Sends a plain text message (not a template) to a customer
 * within the 24-hour messaging window after they replied
 * 
 * Usage:
 *   node scripts/whatsapp/send-text-message.js <PHONE_NUMBER> [MESSAGE]
 * 
 * Example:
 *   node scripts/whatsapp/send-text-message.js +919978783238 "Thank you for your interest!"
 *   node scripts/whatsapp/send-text-message.js 919978783238 "We will get back to you soon."
 */

import 'dotenv/config';

// Get recipient phone number and message from command line
const recipientPhone = process.argv[2];
const customMessage = process.argv.slice(3).join(' ');

if (!recipientPhone) {
  console.error('\n❌ Error: Recipient phone number is required!\n');
  console.log('Usage:');
  console.log('  node scripts/whatsapp/send-text-message.js <PHONE_NUMBER> [MESSAGE]\n');
  console.log('Examples:');
  console.log('  node scripts/whatsapp/send-text-message.js +919978783238 "Thank you!"');
  console.log('  node scripts/whatsapp/send-text-message.js 919978783238 "We received your message"\n');
  process.exit(1);
}

const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!phoneNumberId || !accessToken) {
  console.error('\n❌ Error: Missing required environment variables!\n');
  console.log('Required in .env:');
  console.log('  META_WHATSAPP_PHONE_NUMBER_ID');
  console.log('  META_WHATSAPP_ACCESS_TOKEN\n');
  process.exit(1);
}

// Normalize phone number (remove +, spaces, etc.)
function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '');
}

const normalizedPhone = normalizePhone(recipientPhone);
const messageText = customMessage || 'Hello! Thank you for your interest. How can we help you today?';

console.log('📱 Sending Free-form Text Message via WhatsApp');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Configuration:');
console.log(`  To: ${normalizedPhone} (original: ${recipientPhone})`);
console.log(`  Message: "${messageText}"`);
console.log(`  Phone Number ID: ${phoneNumberId}`);
console.log(`  API Version: ${apiVersion}`);
console.log('');

const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

// THIS IS THE CRITICAL PAYLOAD FOR FREE-FORM TEXT MESSAGES
// (Not templates - this is for 24-hour conversation window)
const payload = {
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: normalizedPhone,
  type: 'text',
  text: {
    preview_url: false,
    body: messageText
  }
};

console.log('📤 Request Details:');
console.log(`  URL: ${url}`);
console.log('  Method: POST');
console.log('  Payload:', JSON.stringify(payload, null, 2));
console.log('');

async function sendTextMessage() {
  try {
    console.log('🚀 Sending message...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('');

    if (response.ok && data.messages) {
      console.log('✅ SUCCESS! Message sent successfully!\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');
      console.log('Message Details:');
      console.log(`  Message ID: ${data.messages[0].id}`);
      console.log(`  Recipient WhatsApp ID: ${data.contacts?.[0]?.wa_id || normalizedPhone}`);
      console.log('');
      console.log('✨ The customer should receive this message within seconds!');
      console.log('');
    } else {
      console.log('❌ ERROR! Failed to send message!\n');
      console.log('Error Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');

      if (data.error) {
        console.log('Error Details:');
        console.log(`  Code: ${data.error.code}`);
        console.log(`  Message: ${data.error.message}`);
        console.log(`  Type: ${data.error.type || 'N/A'}`);
        console.log(`  Subcode: ${data.error.error_subcode || 'N/A'}`);
        
        if (data.error.error_data) {
          console.log(`  Details: ${data.error.error_data.details || 'N/A'}`);
        }
        
        console.log('');
        
        // Provide helpful troubleshooting based on error
        if (data.error.code === 131026) {
          console.log('💡 Troubleshooting: Message Undeliverable (Code 131026)');
          console.log('   This usually means:');
          console.log('   1. The recipient has NOT messaged you in the last 24 hours');
          console.log('   2. You must send a TEMPLATE message first to start a conversation');
          console.log('   3. Or wait for the customer to send you a message\n');
          console.log('   Solution:');
          console.log('   - Use template messages (like tour_package_marketing) to start conversations');
          console.log('   - Once customer replies, you have 24 hours to send free-form messages\n');
        } else if (data.error.code === 100) {
          console.log('💡 Troubleshooting: Invalid Parameter (Code 100)');
          console.log('   Check:');
          console.log('   1. Phone number format is correct (country code without +)');
          console.log('   2. Message text is not empty');
          console.log('   3. All required fields are present\n');
        } else if (data.error.code === 131047) {
          console.log('💡 Troubleshooting: Re-engagement Required (Code 131047)');
          console.log('   The 24-hour window has expired.');
          console.log('   You must send an approved template message to re-engage.\n');
        } else if (data.error.code === 131051) {
          console.log('💡 Troubleshooting: Unsupported Message Type');
          console.log('   The message type is not supported for this recipient.\n');
        }
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FATAL ERROR!\n');
    console.error('Exception:', error.message);
    console.error('');
    console.error('Stack Trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

sendTextMessage();
