#!/usr/bin/env node

/**
 * Send Reply Message via WhatsApp (24-Hour Window)
 * 
 * This script helps you reply to customers within the 24-hour messaging window.
 * It checks recent messages from the customer and sends a text reply.
 * 
 * Usage:
 *   node scripts/whatsapp/send-reply-message.js <PHONE_NUMBER> <MESSAGE> [--force]
 * 
 * Examples:
 *   node scripts/whatsapp/send-reply-message.js +919978783238 "Thank you for your interest!"
 *   node scripts/whatsapp/send-reply-message.js 919978783238 "We'll get back to you soon"
 *   node scripts/whatsapp/send-reply-message.js 919978783238 "Hello!" --force
 * 
 * Options:
 *   --force    Skip 24-hour window check (use with caution)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const forceFlag = args.includes('--force');
const filteredArgs = args.filter(arg => arg !== '--force');

const recipientPhone = filteredArgs[0];
const messageText = filteredArgs.slice(1).join(' ');

if (!recipientPhone || !messageText) {
  console.error('\n❌ Error: Phone number and message are required!\n');
  console.log('Usage:');
  console.log('  node scripts/whatsapp/send-reply-message.js <PHONE_NUMBER> <MESSAGE> [--force]\n');
  console.log('Examples:');
  console.log('  node scripts/whatsapp/send-reply-message.js +919978783238 "Thank you!"');
  console.log('  node scripts/whatsapp/send-reply-message.js 919978783238 "We received your message"');
  console.log('  node scripts/whatsapp/send-reply-message.js 919978783238 "Hello!" --force\n');
  console.log('Options:');
  console.log('  --force    Skip 24-hour window check\n');
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

// Normalize phone number
function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '');
}

const normalizedPhone = normalizePhone(recipientPhone);

console.log('💬 WhatsApp Reply Message Tool');
console.log('═══════════════════════════════════════════════════════════\n');

async function checkMessageWindow() {
  console.log('🔍 Checking 24-hour messaging window...\n');

  try {
    // Find the most recent inbound message from this customer
    const lastInboundMessage = await prisma.whatsAppMessage.findFirst({
      where: {
        from: {
          contains: normalizedPhone
        },
        direction: 'inbound',
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastInboundMessage) {
      console.log('⚠️  No incoming messages found from this customer in database.\n');
      console.log('   This means either:');
      console.log('   1. Customer has never messaged you');
      console.log('   2. Messages not being stored in database (webhook issue)\n');
      
      if (!forceFlag) {
        console.log('❌ Cannot send - 24-hour window verification failed!\n');
        console.log('💡 Solutions:');
        console.log('   1. Send a template message first (e.g., tour_package_marketing)');
        console.log('   2. Wait for customer to message you');
        console.log('   3. Use --force flag to skip this check (may fail at Meta API)\n');
        process.exit(1);
      } else {
        console.log('⚠️  Using --force flag - proceeding anyway...\n');
      }
    } else {
      const messageAge = Date.now() - lastInboundMessage.createdAt.getTime();
      const hoursAgo = messageAge / (1000 * 60 * 60);
      const minutesAgo = messageAge / (1000 * 60);

      console.log('✅ Found last message from customer:');
      console.log(`   Message: "${lastInboundMessage.message?.substring(0, 50)}..."`);
      console.log(`   Received: ${lastInboundMessage.createdAt.toISOString()}`);
      
      if (hoursAgo < 1) {
        console.log(`   Time ago: ${Math.round(minutesAgo)} minutes ago`);
      } else {
        console.log(`   Time ago: ${hoursAgo.toFixed(1)} hours ago`);
      }
      console.log('');

      if (hoursAgo > 24) {
        console.log('❌ 24-HOUR WINDOW EXPIRED!\n');
        console.log(`   Last message was ${hoursAgo.toFixed(1)} hours ago (> 24 hours)`);
        console.log('');
        console.log('💡 To message this customer, you must:');
        console.log('   1. Send an approved template message (e.g., tour_package_marketing)');
        console.log('   2. Wait for customer to reply to the template');
        console.log('   3. Then send free-form messages within 24 hours\n');
        console.log('   Or use --force flag to attempt sending anyway (will likely fail)\n');

        if (!forceFlag) {
          process.exit(1);
        } else {
          console.log('⚠️  Using --force flag - attempting to send...\n');
        }
      } else {
        const hoursRemaining = 24 - hoursAgo;
        console.log('✅ WITHIN 24-HOUR WINDOW!');
        console.log(`   ${hoursRemaining.toFixed(1)} hours remaining to send free-form messages\n`);
      }
    }
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (!forceFlag) {
      console.log('\n💡 Use --force flag to skip this check and send anyway\n');
      process.exit(1);
    } else {
      console.log('\n⚠️  Using --force flag - proceeding anyway...\n');
    }
  }
}

async function sendMessage() {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

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

  console.log('📤 Sending Message:');
  console.log(`   To: ${normalizedPhone}`);
  console.log(`   Message: "${messageText}"`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.messages) {
      console.log('✅ SUCCESS! Message sent!\n');
      console.log(`   Message ID: ${data.messages[0].id}`);
      console.log(`   Recipient: ${data.contacts[0].wa_id}`);
      console.log('');
      console.log('✨ Customer should receive this message now!\n');
    } else {
      console.log('❌ FAILED to send message!\n');
      console.log('API Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('');

      if (data.error) {
        if (data.error.code === 131026) {
          console.log('💡 Error Code 131026: Message Undeliverable');
          console.log('   This confirms the customer has NOT messaged you in last 24 hours.');
          console.log('');
          console.log('   SOLUTION:');
          console.log('   1. Send template message first:');
          console.log('      node scripts/whatsapp/send-tour-package-template.js ' + recipientPhone);
          console.log('');
          console.log('   2. Wait for customer to reply (or click the Flow button)');
          console.log('');
          console.log('   3. Then you can send free-form messages like this one\n');
        } else if (data.error.code === 131047) {
          console.log('💡 Error Code 131047: Re-engagement Required');
          console.log('   The 24-hour conversation window has expired.');
          console.log('   Send a template message to start a new conversation.\n');
        } else {
          console.log(`💡 Error Code ${data.error.code}: ${data.error.message}\n`);
        }
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Check 24-hour window (unless --force is used)
  await checkMessageWindow();

  // Send the message
  await sendMessage();
}

main().catch(async (error) => {
  console.error('Unexpected error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
