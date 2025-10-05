#!/usr/bin/env node

/**
 * Verify Public Key Upload Status
 * 
 * Checks if the public key was successfully uploaded and is active
 */

import 'dotenv/config';

const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

if (!accessToken || !phoneNumberId) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

console.log('================================================');
console.log('Verifying Public Key Upload Status');
console.log('================================================\n');

try {
  const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_encryption`;
  
  console.log(`Checking: ${apiUrl}\n`);
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Public Key Status Retrieved!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.public_key) {
      console.log('\n🔑 Key Details:');
      console.log('Status: ACTIVE and ready for Flow encryption');
      console.log('Key uploaded successfully!');
    }
  } else {
    console.log('Response:', JSON.stringify(data, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}