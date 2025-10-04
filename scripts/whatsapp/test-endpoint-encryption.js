/**
 * Test WhatsApp Flow Endpoint - Check Encryption Keys
 * 
 * This script tests if the endpoint can decrypt requests properly
 * by sending a mock encrypted INIT request.
 * 
 * Usage:
 *   node scripts/whatsapp/test-endpoint-encryption.js [production|local]
 * 
 * Examples:
 *   node scripts/whatsapp/test-endpoint-encryption.js production
 *   node scripts/whatsapp/test-endpoint-encryption.js local
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const mode = process.argv[2] || 'production';

const endpoints = {
  production: 'https://admin.aagamholidays.com/api/whatsapp/flow-endpoint',
  local: 'http://localhost:3000/api/whatsapp/flow-endpoint'
};

const endpointUrl = endpoints[mode];

if (!endpointUrl) {
  console.error('\n❌ Invalid mode. Use "production" or "local"\n');
  process.exit(1);
}

console.log('\n================================================');
console.log('Testing WhatsApp Flow Endpoint Encryption');
console.log('================================================\n');
console.log(`Mode: ${mode}`);
console.log(`URL: ${endpointUrl}\n`);

// Read the public key to encrypt the test request
const publicKeyPath = path.join(process.cwd(), 'flow-keys', 'public.pem');
if (!fs.existsSync(publicKeyPath)) {
  console.error(`❌ Public key not found at ${publicKeyPath}\n`);
  process.exit(1);
}

const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');

// Create a test INIT request
const testRequest = {
  action: 'INIT',
  flow_token: 'test-flow-token-' + Date.now(),
  version: '3.0'
};

console.log('📋 Test Request (decrypted):');
console.log(JSON.stringify(testRequest, null, 2));
console.log('');

try {
  // Generate AES key and IV
  const aesKey = crypto.randomBytes(16); // 128 bits
  const iv = crypto.randomBytes(12); // 96 bits for GCM

  // Encrypt the request body using AES-128-GCM
  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
  const encryptedBody = Buffer.concat([
    cipher.update(JSON.stringify(testRequest), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Encrypt the AES key using RSA public key
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const encryptedAesKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  // Prepare encrypted payload
  const encryptedPayload = {
    encrypted_aes_key: encryptedAesKey.toString('base64'),
    encrypted_flow_data: encryptedBody.toString('base64'),
    initial_vector: iv.toString('base64')
  };

  console.log('🔐 Encrypted Payload:');
  console.log(`- Encrypted AES Key: ${encryptedPayload.encrypted_aes_key.substring(0, 50)}...`);
  console.log(`- Encrypted Data: ${encryptedPayload.encrypted_flow_data.substring(0, 50)}...`);
  console.log(`- IV: ${encryptedPayload.initial_vector}`);
  console.log('');

  // Calculate signature (simplified - using a mock app secret)
  const appSecret = process.env.META_APP_SECRET || 'test-secret';
  const bodyString = JSON.stringify(encryptedPayload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(bodyString)
    .digest('hex');

  console.log('📤 Sending encrypted POST request...\n');

  // Send the request
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature,
    },
    body: bodyString
  });

  console.log(`📥 Response Status: ${response.status} ${response.statusText}\n`);

  const responseText = await response.text();
  
  if (response.ok) {
    console.log('✅ Response received (encrypted):\n');
    console.log(responseText.substring(0, 200) + '...\n');

    try {
      // Try to decrypt the response
      const responseBuffer = Buffer.from(responseText, 'base64');
      
      // Flip IV for response decryption
      const flippedIv = Buffer.from(iv);
      for (let i = 0; i < flippedIv.length; i++) {
        flippedIv[i] = ~flippedIv[i] & 0xFF;
      }

      const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, flippedIv);
      decipher.setAuthTag(responseBuffer.slice(-16));
      
      const decryptedResponse = Buffer.concat([
        decipher.update(responseBuffer.slice(0, -16)),
        decipher.final()
      ]).toString('utf8');

      console.log('🔓 Decrypted Response:\n');
      const responseData = JSON.parse(decryptedResponse);
      console.log(JSON.stringify(responseData, null, 2));
      console.log('');

      // Check if we got the expected data
      if (responseData.screen === 'DESTINATION_SELECTOR' && responseData.data?.destinations) {
        console.log('✅ SUCCESS! Endpoint is working correctly!\n');
        console.log('📊 Response Analysis:');
        console.log('─'.repeat(50));
        console.log(`Screen: ${responseData.screen}`);
        console.log(`Destinations found: ${responseData.data.destinations.length}`);
        console.log('\nDestination List:');
        responseData.data.destinations.forEach((dest, i) => {
          console.log(`  ${i + 1}. ${dest.title} (${dest.id})`);
        });
        console.log('\n' + '='.repeat(50));
        console.log('🎉 All encryption/decryption working!');
        console.log('Environment variables are properly set.');
        console.log('='.repeat(50) + '\n');
        process.exit(0);
      } else {
        console.log('⚠️  Response format unexpected');
        console.log('Expected: screen=DESTINATION_SELECTOR with destinations array');
        console.log('Got:', responseData);
      }
    } catch (decryptError) {
      console.error('❌ Failed to decrypt response:', decryptError.message);
      console.error('\nThis might mean:');
      console.error('- Response is not encrypted (check endpoint code)');
      console.error('- Encryption key mismatch\n');
    }
  } else {
    console.error('❌ Request Failed\n');
    console.error('Response:', responseText);
    console.error('\n📋 Possible Issues:');
    console.error('─'.repeat(50));
    
    if (response.status === 432) {
      console.error('❌ Status 432: Signature validation failed');
      console.error('   → Check META_APP_SECRET in .env matches Vercel');
    } else if (response.status === 500) {
      console.error('❌ Status 500: Server error (likely decryption failed)');
      console.error('   → WHATSAPP_FLOW_PRIVATE_KEY not set on Vercel');
      console.error('   → WHATSAPP_FLOW_KEY_PASSPHRASE not set on Vercel');
      console.error('   → Or passphrase is incorrect');
    } else if (response.status === 404) {
      console.error('❌ Status 404: Endpoint not found');
      console.error('   → Route not deployed');
    } else if (response.status === 405) {
      console.error('❌ Status 405: Method not allowed');
      console.error('   → POST handler missing');
    }
    
    console.error('');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Test Error:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
