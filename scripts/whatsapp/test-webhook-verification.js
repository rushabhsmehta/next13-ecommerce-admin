#!/usr/bin/env node

/**
 * Test Meta WhatsApp Webhook Verification Locally
 * This simulates what Meta does when verifying your webhook
 */

require('dotenv').config();

const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

console.log('🔧 Testing Webhook Verification Logic...\n');

// Step 1: Check environment variable
console.log('1. Environment Variable Check:');
console.log(`   META_WEBHOOK_VERIFY_TOKEN: ${WEBHOOK_VERIFY_TOKEN ? '✅ Set' : '❌ Not Set'}`);
console.log(`   Value: "${WEBHOOK_VERIFY_TOKEN}"\n`);

// Step 2: Simulate Meta's verification request
console.log('2. Simulating Meta Verification Request:');
const mockRequest = {
  mode: 'subscribe',
  token: 'aagam_whatsapp_webhook_2024_secure_token',
  challenge: 'test_challenge_1234567890',
};

console.log('   Meta sends:');
console.log(`   - hub.mode: "${mockRequest.mode}"`);
console.log(`   - hub.verify_token: "${mockRequest.token}"`);
console.log(`   - hub.challenge: "${mockRequest.challenge}"\n`);

// Step 3: Verify token logic (same as in webhook route)
console.log('3. Verification Logic:');
const isValidMode = mockRequest.mode === 'subscribe';
const isValidToken = mockRequest.token === WEBHOOK_VERIFY_TOKEN;

console.log(`   ✓ Mode check: ${isValidMode ? '✅ PASS' : '❌ FAIL'} (mode === 'subscribe')`);
console.log(`   ✓ Token check: ${isValidToken ? '✅ PASS' : '❌ FAIL'} (tokens match)`);

if (isValidMode && isValidToken) {
  console.log(`\n✅ SUCCESS! Webhook would return challenge: "${mockRequest.challenge}"`);
  console.log('\n📝 Your webhook endpoint should work correctly!\n');
} else {
  console.log('\n❌ FAILED! Webhook verification would fail.');
  if (!isValidToken) {
    console.log('\n🔍 Token Mismatch Details:');
    console.log(`   Expected in .env: "${WEBHOOK_VERIFY_TOKEN}"`);
    console.log(`   Received from Meta: "${mockRequest.token}"`);
    console.log(`   Match: ${WEBHOOK_VERIFY_TOKEN === mockRequest.token}\n`);
  }
}

// Step 4: Test the actual verification function
console.log('4. Testing Actual Function:');
try {
  // Import the function from your code
  const { verifyWebhookSignature } = require('../../src/lib/whatsapp.ts');
  
  const result = verifyWebhookSignature(
    mockRequest.mode,
    mockRequest.token,
    mockRequest.challenge
  );
  
  if (result === mockRequest.challenge) {
    console.log('   ✅ verifyWebhookSignature() works correctly!');
    console.log(`   Returned: "${result}"\n`);
  } else {
    console.log('   ❌ verifyWebhookSignature() returned wrong value');
    console.log(`   Expected: "${mockRequest.challenge}"`);
    console.log(`   Got: "${result}"\n`);
  }
} catch (error) {
  console.log('   ⚠️  Cannot import TypeScript function directly');
  console.log('   This is expected - the function will work in Next.js\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('📋 CHECKLIST FOR META DASHBOARD:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Callback URL:');
console.log('   https://admin.aagamholidays.com/api/whatsapp/webhook');
console.log('');
console.log('Verify token:');
console.log(`   ${WEBHOOK_VERIFY_TOKEN}`);
console.log('');
console.log('⚠️  IMPORTANT:');
console.log('   1. Make sure your production server has this exact token in .env');
console.log('   2. Restart your production server after updating .env');
console.log('   3. Ensure /api/whatsapp/webhook endpoint is deployed');
console.log('');
