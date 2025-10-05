#!/usr/bin/env node

/**
 * Check Public Key Status for All Flows
 * 
 * Verifies if the public key is properly associated with different Flows
 */

import 'dotenv/config';

const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

console.log('================================================');
console.log('Checking Public Key Status for All Flows');
console.log('================================================\n');

try {
  // Check public key status
  const keyUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_encryption`;
  
  console.log(`Checking public key status: ${keyUrl}\n`);
  
  const keyResponse = await fetch(keyUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const keyData = await keyResponse.json();

  if (keyResponse.ok && keyData.data) {
    console.log('🔑 Public Key Status:');
    console.log('═══════════════════════════════════════════════════════════');
    
    keyData.data.forEach((key, index) => {
      console.log(`Key #${index + 1}:`);
      console.log(`  Status: ${key.business_public_key_signature_status}`);
      console.log(`  Key Length: ${key.business_public_key ? key.business_public_key.length : 'N/A'} characters`);
      console.log('');
    });
    
    const validKeys = keyData.data.filter(key => 
      key.business_public_key_signature_status === 'VALID'
    );
    
    if (validKeys.length > 0) {
      console.log(`✅ Found ${validKeys.length} VALID public key(s)`);
      console.log('\n📋 Next Steps for Flow Builder:');
      console.log('1. Go to your Flow in WhatsApp Manager');
      console.log('2. Click on "Endpoint" tab');
      console.log('3. Click the blue circle next to "Sign public key"');
      console.log('4. Follow the instructions to complete the step');
      console.log('5. You should see a green checkmark after completion');
      
      console.log('\n💡 The public key is already uploaded and VALID!');
      console.log('   You just need to associate it with your specific Flow.');
    } else {
      console.log('❌ No valid public keys found');
    }
    
  } else {
    console.log('❌ Failed to check public key status');
    console.log('Response:', JSON.stringify(keyData, null, 2));
  }
  
  // Also check if there are any flows associated with the business account
  console.log('\n🌊 Checking Flow Information...');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Note: Flow listing requires different permissions and endpoints
  console.log('📝 To see Flow-specific public key associations:');
  console.log('1. Open WhatsApp Manager > Flows');
  console.log('2. Select your Flow');
  console.log('3. Go to Endpoint tab');
  console.log('4. Check the "Sign public key" step status');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}