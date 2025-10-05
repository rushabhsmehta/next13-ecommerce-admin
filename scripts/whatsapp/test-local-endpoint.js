#!/usr/bin/env node
/**
 * Test WhatsApp Flow Endpoint Locally
 * Tests the Flow endpoint running on localhost or deployment
 */

import fs from 'fs';
import crypto from 'crypto';

// Configuration
const LOCAL_URL = 'http://localhost:3000/api/whatsapp/flow-endpoint';
const PRODUCTION_URL = 'https://next13-ecommerce-admin.vercel.app/api/whatsapp/flow-endpoint';
const MODE = process.env.NODE_ENV === 'production' ? 'production' : 'local';
const ENDPOINT_URL = MODE === 'production' ? PRODUCTION_URL : LOCAL_URL;

console.log('================================================');
console.log('Testing WhatsApp Flow Endpoint');
console.log('================================================');
console.log('');
console.log(`Mode: ${MODE}`);
console.log(`URL: ${ENDPOINT_URL}`);
console.log('');

/**
 * Create a mock encrypted request using the public key
 */
function createMockEncryptedRequest() {
  try {
    // Read public key
    const publicKeyPath = 'flow-keys/public.pem';
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error('Public key not found. Please run: node scripts/whatsapp/generate-flow-keys-secure-node.js');
    }
    
    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');
    
    // Create a mock Flow request
    const mockFlowRequest = {
      version: "1.0",
      action: "ping",
      flow_token: "test-flow-token-12345"
    };
    
    // Generate random AES key and IV
    const aesKey = crypto.randomBytes(16); // AES-128 key
    const iv = crypto.randomBytes(12); // GCM IV
    
    // Encrypt the Flow request with AES-GCM
    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
    const encryptedData = Buffer.concat([
      cipher.update(JSON.stringify(mockFlowRequest), 'utf-8'),
      cipher.final(),
      cipher.getAuthTag()
    ]);
    
    // Encrypt the AES key with RSA-OAEP
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey
    );
    
    return {
      encrypted_flow_data: encryptedData.toString('base64'),
      encrypted_aes_key: encryptedAesKey.toString('base64'),
      initial_vector: iv.toString('base64')
    };
  } catch (error) {
    console.error('❌ Failed to create mock request:', error.message);
    throw error;
  }
}

/**
 * Test the endpoint with different request types
 */
async function runTests() {
  console.log('📋 Test 1: Health Check (GET Request)');
  console.log('──────────────────────────────────────────────────');
  try {
    const response = await fetch(ENDPOINT_URL, { method: 'GET' });
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Body:', data);
      console.log('✅ Health Check PASSED');
    } else {
      const text = await response.text();
      console.log('Body:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      console.log('❌ Health Check FAILED');
    }
  } catch (error) {
    console.log('❌ Health Check ERROR:', error.message);
  }
  
  console.log('');
  console.log('📋 Test 2: CORS Preflight (OPTIONS Request)');
  console.log('──────────────────────────────────────────────────');
  try {
    const response = await fetch(ENDPOINT_URL, { 
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://business.facebook.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Hub-Signature-256'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
    });
    
    if (response.status === 200 || response.status === 204) {
      console.log('✅ CORS Preflight PASSED');
    } else {
      console.log('❌ CORS Preflight FAILED');
    }
  } catch (error) {
    console.log('❌ CORS Preflight ERROR:', error.message);
  }
  
  console.log('');
  console.log('📋 Test 3: Mock Encrypted Request (POST)');
  console.log('──────────────────────────────────────────────────');
  try {
    const mockRequest = createMockEncryptedRequest();
    
    // Create signature for the request
    const appSecret = process.env.META_APP_SECRET;
    const body = JSON.stringify(mockRequest);
    
    let signature = '';
    if (appSecret) {
      const hmac = crypto.createHmac('sha256', appSecret);
      signature = 'sha256=' + hmac.update(body).digest('hex');
    }
    
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature || 'sha256=test',
        'User-Agent': 'WhatsAppFlowsClient/1.0'
      },
      body: body
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Content-Type:', response.headers.get('Content-Type'));
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('Response length:', responseText.length);
      console.log('Response (first 100 chars):', responseText.substring(0, 100) + '...');
      console.log('✅ Mock Request PASSED');
    } else {
      const errorText = await response.text();
      console.log('Error:', errorText.substring(0, 200));
      console.log('❌ Mock Request FAILED');
    }
  } catch (error) {
    console.log('❌ Mock Request ERROR:', error.message);
  }
  
  console.log('');
  console.log('================================================');
  console.log('Test Results Summary');
  console.log('================================================');
  console.log('');
  console.log('If all tests pass, your endpoint is working correctly!');
  console.log('If tests fail with 404, your route might not be deployed.');
  console.log('');
  console.log('💡 Deployment Tips:');
  console.log('──────────────────────────────────────────────');
  console.log('1. Commit your changes: git add . && git commit -m "Update Flow endpoint"');
  console.log('2. Push to deploy: git push origin main');
  console.log('3. Check Vercel dashboard for deployment status');
  console.log('4. Wait 1-2 minutes for deployment to complete');
  console.log('');
}

// Run the tests
runTests().catch(console.error);