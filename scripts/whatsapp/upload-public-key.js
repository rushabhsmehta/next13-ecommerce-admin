/**
 * Upload Public Key to Meta WhatsApp Business Encryption
 * 
 * This script uploads the RSA public key to your WhatsApp Business Phone Number
 * so Meta can encrypt data sent to your Flow endpoint.
 * 
 * Prerequisites:
 * - META_WHATSAPP_ACCESS_TOKEN in .env
 * - META_WHATSAPP_PHONE_NUMBER_ID in .env
 * - flow-keys/public.pem file exists
 * 
 * Usage:
 *   node scripts/whatsapp/upload-public-key.js
 * 
 * Documentation:
 *   https://developers.facebook.com/docs/whatsapp/cloud-api/reference/flows-encryption
 */

import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Get access token and phone number ID from environment
const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;

if (!accessToken) {
  console.error('\n❌ Error: META_WHATSAPP_ACCESS_TOKEN not found in .env file!\n');
  process.exit(1);
}

if (!phoneNumberId) {
  console.error('\n❌ Error: META_WHATSAPP_PHONE_NUMBER_ID not found in .env file!\n');
  process.exit(1);
}

// Read public key
const publicKeyPath = path.join(process.cwd(), 'flow-keys', 'public.pem');
if (!fs.existsSync(publicKeyPath)) {
  console.error(`\n❌ Error: Public key not found at ${publicKeyPath}\n`);
  console.log('Generate keys first by running:');
  console.log('  node scripts/whatsapp/generate-flow-keys-secure-node.js "YourPassphrase"\n');
  process.exit(1);
}

const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

console.log('\n================================================');
console.log('Uploading Public Key to Meta WhatsApp');
console.log('================================================\n');

console.log(`Phone Number ID: ${phoneNumberId}`);
console.log(`Public Key: ${publicKeyPath}`);
console.log(`\nPublic Key Content:\n${publicKey}`);

// Upload to Meta - CORRECT endpoint per official docs
const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_encryption`;

console.log(`\nUploading to: ${apiUrl}\n`);

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      business_public_key: publicKey
    }).toString()
  });

  const data = await response.json();

  if (response.ok && data.success) {
    console.log('✅ SUCCESS! Public key uploaded successfully!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n================================================');
    console.log('Next Steps:');
    console.log('================================================');
    console.log('1. Verify key status by running:');
    console.log(`   curl -X GET 'https://graph.facebook.com/v22.0/${phoneNumberId}/whatsapp_business_encryption' -H 'Authorization: Bearer ${accessToken}'`);
    console.log('\n2. Go to Meta Flow Builder');
    console.log('3. Your Flow > ... > Endpoint');
    console.log('4. Status should show "Public key signature status: VALID"');
    console.log('5. Test your flow in WhatsApp\n');
  } else {
    console.error('❌ Error uploading public key:\n');
    console.error('Status:', response.status, response.statusText);
    console.error('Response:', JSON.stringify(data, null, 2));
    console.error('\nCommon Issues:');
    console.error('- Invalid Flow ID');
    console.error('- Invalid or expired access token');
    console.error('- Insufficient permissions on access token');
    console.error('- Public key format invalid\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nMake sure:');
  console.error('- You have internet connection');
  console.error('- META_WHATSAPP_ACCESS_TOKEN is valid');
  console.error('- Flow ID is correct\n');
  process.exit(1);
}
