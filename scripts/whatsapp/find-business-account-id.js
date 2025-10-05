#!/usr/bin/env node

/**
 * Find WhatsApp Business Account ID
 * 
 * Uses the Phone Number ID to find the correct Business Account ID
 */

import 'dotenv/config';

const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!phoneNumberId || !accessToken) {
  console.error('\n❌ Error: Missing environment variables!\n');
  process.exit(1);
}

console.log('================================================');
console.log('Finding WhatsApp Business Account ID');
console.log('================================================\n');

try {
  // Get phone number details which includes business account info
  const phoneUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,messaging_limit_tier,is_official_business_account`;
  
  console.log(`Phone Number ID: ${phoneNumberId}`);
  console.log(`Fetching from: ${phoneUrl}\n`);

  const phoneResponse = await fetch(phoneUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const phoneData = await phoneResponse.json();
  
  console.log('📱 Phone Number Details:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(phoneData, null, 2));
  console.log('');

  // Try to get business account from phone number
  const businessUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/whatsapp_business_account`;
  
  console.log(`Fetching business account from: ${businessUrl}\n`);

  const businessResponse = await fetch(businessUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const businessData = await businessResponse.json();
  
  console.log('🏢 Business Account Details:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(JSON.stringify(businessData, null, 2));
  
  if (businessData.id) {
    console.log(`\n✅ Found Business Account ID: ${businessData.id}`);
    console.log('\nUpdate your .env files with:');
    console.log(`META_WHATSAPP_BUSINESS_ACCOUNT_ID=${businessData.id}`);
  }

} catch (error) {
  console.error('❌ ERROR!', error.message);
  process.exit(1);
}