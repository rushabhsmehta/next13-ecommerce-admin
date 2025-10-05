#!/usr/bin/env node

/**
 * Verify Business Account ID and Flow Association
 * 
 * Checks which Business Account ID is correct and how it relates to the Flow
 */

import 'dotenv/config';

const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const currentBusinessId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

// From your Flow URL
const flowUrlBusinessId = '1259119921508566';
const flowId = '656507700576906';

console.log('================================================');
console.log('Business Account ID Verification');
console.log('================================================\n');

console.log('🔍 Configuration Analysis:');
console.log(`Current .env Business ID: ${currentBusinessId}`);
console.log(`Flow URL Business ID: ${flowUrlBusinessId}`);
console.log(`Flow ID: ${flowId}`);
console.log(`Phone Number ID: ${phoneNumberId}\n`);

// Test 1: Check templates with current Business ID
console.log('📋 Test 1: Templates with Current Business ID');
console.log('─'.repeat(50));

try {
  const templatesUrl = `https://graph.facebook.com/v22.0/${currentBusinessId}/message_templates`;
  const templatesResponse = await fetch(templatesUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const templatesData = await templatesResponse.json();
  
  if (templatesResponse.ok && templatesData.data) {
    console.log(`✅ SUCCESS: Found ${templatesData.data.length} templates`);
    console.log(`   Business ID ${currentBusinessId} is VALID for templates`);
  } else {
    console.log('❌ FAILED: Current Business ID not working for templates');
    console.log('   Error:', templatesData.error?.message);
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

console.log('\n📋 Test 2: Templates with Flow URL Business ID');
console.log('─'.repeat(50));

try {
  const templatesUrl2 = `https://graph.facebook.com/v22.0/${flowUrlBusinessId}/message_templates`;
  const templatesResponse2 = await fetch(templatesUrl2, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const templatesData2 = await templatesResponse2.json();
  
  if (templatesResponse2.ok && templatesData2.data) {
    console.log(`✅ SUCCESS: Found ${templatesData2.data.length} templates`);
    console.log(`   Business ID ${flowUrlBusinessId} is ALSO VALID for templates`);
  } else {
    console.log('❌ FAILED: Flow URL Business ID not working for templates');
    console.log('   Error:', templatesData2.error?.message);
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

// Test 3: Check public key status with both IDs
console.log('\n🔑 Test 3: Public Key Status');
console.log('─'.repeat(50));

try {
  const keyUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_encryption`;
  const keyResponse = await fetch(keyUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const keyData = await keyResponse.json();
  
  if (keyResponse.ok && keyData.data) {
    console.log(`✅ Public Key Status: ${keyData.data[0]?.business_public_key_signature_status}`);
    console.log(`   Phone Number ID: ${phoneNumberId}`);
  } else {
    console.log('❌ Failed to check public key status');
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

// Test 4: Try to get phone number details to see which business it belongs to
console.log('\n📱 Test 4: Phone Number Business Association');
console.log('─'.repeat(50));

try {
  const phoneUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}`;
  const phoneResponse = await fetch(phoneUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const phoneData = await phoneResponse.json();
  
  if (phoneResponse.ok) {
    console.log('✅ Phone Number Details:');
    console.log(`   Display Number: ${phoneData.display_phone_number}`);
    console.log(`   Verified Name: ${phoneData.verified_name}`);
  } else {
    console.log('❌ Failed to get phone number details');
    console.log('   Error:', phoneData.error?.message);
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}

console.log('\n💡 Analysis & Recommendations:');
console.log('═'.repeat(50));
console.log('1. If both Business IDs work for templates, you might have multiple businesses');
console.log('2. The Flow might be associated with a different Business Account');
console.log('3. The public key was uploaded to the correct Phone Number ID');
console.log('4. You may need to upload the public key to the Flow\'s specific Business Account');

console.log('\n🔧 Next Steps:');
console.log('─'.repeat(50));
console.log('1. Verify which Business Account ID your Flow actually belongs to');
console.log('2. Update .env with the correct Business Account ID if needed');
console.log('3. Re-upload public key if using a different Business Account');
console.log('4. Or associate the Flow with the current Business Account');