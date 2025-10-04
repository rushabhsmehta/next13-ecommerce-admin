#!/usr/bin/env node

/**
 * Test Meta WhatsApp Template: kashmirtest
 * Try with multiple language codes since "en" failed
 * Sends to: +919978783238
 */

require('dotenv').config();

const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

const recipientNumber = '919978783238'; // No + prefix for API
const templateName = 'kashmirtest';

// Try multiple language codes
const languageCodesToTry = [
  { code: 'en', name: 'English' },
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hi_IN', name: 'Hindi (India)' }
];

console.log('📱 Testing WhatsApp Template: kashmirtest');
console.log('═══════════════════════════════════════════════════════════\n');

async function sendTemplateWithLanguage(langCode, langName) {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: langCode
      }
    }
  };

  console.log(`\n📤 Trying with language: ${langName} (${langCode})`);
  console.log('─────────────────────────────────────────────────────────');

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

    if (response.ok && data.messages) {
      console.log(`✅ SUCCESS with ${langCode}!`);
      console.log(`   Message ID: ${data.messages[0].id}`);
      console.log(`   Recipient: +${recipientNumber}`);
      console.log('\n📱 Check your WhatsApp (+919978783238) for the message!');
      return true;
    } else {
      console.log(`❌ Failed with ${langCode}`);
      if (data.error) {
        console.log(`   Error: ${data.error.message}`);
        console.log(`   Code: ${data.error.code}`);
      }
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ERROR with ${langCode}:`);
    console.log(`   ${error.message}`);
    return false;
  }
}

async function tryAllLanguages() {
  console.log('Will try sending with multiple language codes...');
  console.log('(Template might be in a different language)\n');
  
  for (const lang of languageCodesToTry) {
    const success = await sendTemplateWithLanguage(lang.code, lang.name);
    if (success) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('✅ Found the correct language code!');
      console.log(`   Use language code: "${lang.code}" for this template`);
      console.log('═══════════════════════════════════════════════════════════');
      return;
    }
    // Wait a bit between tries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('❌ All language codes failed!');
  console.log('\n⚠️  POSSIBLE REASONS:');
  console.log('   1. Template status is "Quality pending" - not approved yet');
  console.log('   2. Template was created with a different language');
  console.log('   3. Template name is different than "kashmirtest"');
  console.log('\n💡 SOLUTION:');
  console.log('   - Wait for Meta to approve the template (24-48 hours)');
  console.log('   - Check the template status in Meta Business Manager');
  console.log('   - Status should be "APPROVED" before you can send');
  console.log('═══════════════════════════════════════════════════════════');
}

// Check configuration first
if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.log('❌ Missing required environment variables!');
  process.exit(1);
}

// Try all language codes
tryAllLanguages();
