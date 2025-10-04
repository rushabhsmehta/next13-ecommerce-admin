/**
 * Test WhatsApp Flow Endpoint
 * 
 * This script tests both the health check (GET) and the encrypted data exchange (POST)
 * to diagnose why Meta Flow Builder is getting 405 errors.
 * 
 * Usage:
 *   node scripts/whatsapp/test-flow-endpoint.js [production|local]
 * 
 * Examples:
 *   node scripts/whatsapp/test-flow-endpoint.js production
 *   node scripts/whatsapp/test-flow-endpoint.js local
 */

const mode = process.argv[2] || 'production';

const endpoints = {
  production: 'https://next13-ecommerce-admin.vercel.app/api/whatsapp/flow-endpoint',
  local: 'http://localhost:3000/api/whatsapp/flow-endpoint'
};

const endpointUrl = endpoints[mode];

if (!endpointUrl) {
  console.error('\n❌ Invalid mode. Use "production" or "local"\n');
  process.exit(1);
}

console.log('\n================================================');
console.log('Testing WhatsApp Flow Endpoint');
console.log('================================================\n');
console.log(`Mode: ${mode}`);
console.log(`URL: ${endpointUrl}\n`);

// Test 1: Health Check (GET)
async function testHealthCheck() {
  console.log('📋 Test 1: Health Check (GET Request)');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WhatsApp-Flow-Health-Check-Test',
      }
    });

    const data = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Body:`, data);
    
    if (response.ok) {
      console.log('✅ Health Check PASSED\n');
      return true;
    } else {
      console.log('❌ Health Check FAILED\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 2: POST with ping action (simplest valid request)
async function testPingRequest() {
  console.log('📋 Test 2: Ping Request (POST - No Encryption)');
  console.log('─'.repeat(50));
  
  try {
    const pingPayload = {
      version: '3.0',
      action: 'ping',
      flow_token: 'test-flow-token-ping'
    };

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Flow-Ping-Test',
      },
      body: JSON.stringify(pingPayload)
    });

    const data = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Body:`, data);
    
    if (response.ok) {
      console.log('✅ Ping Request PASSED\n');
      return true;
    } else {
      console.log('❌ Ping Request FAILED\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 3: POST with signature verification (what Meta actually sends)
async function testSignatureRequest() {
  console.log('📋 Test 3: Signature Validation (POST with X-Hub-Signature-256)');
  console.log('─'.repeat(50));
  
  try {
    const payload = {
      version: '3.0',
      action: 'ping',
      flow_token: 'test-flow-token-signature'
    };

    const bodyString = JSON.stringify(payload);
    
    // Create mock signature (won't be valid but tests the flow)
    const mockSignature = 'sha256=mock_signature_for_testing';

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': mockSignature,
        'User-Agent': 'WhatsApp-Flow-Signature-Test',
      },
      body: bodyString
    });

    const data = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Body:`, data);
    
    // Expected: might fail signature validation but shouldn't be 405
    if (response.status === 405) {
      console.log('❌ Method Not Allowed - This is the problem!\n');
      return false;
    } else if (response.status === 401 || response.status === 403) {
      console.log('✅ Signature validation working (rejected as expected)\n');
      return true;
    } else if (response.ok) {
      console.log('✅ Request accepted\n');
      return true;
    } else {
      console.log('⚠️  Got status:', response.status, '\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 4: OPTIONS request (CORS preflight)
async function testOptionsRequest() {
  console.log('📋 Test 4: CORS Preflight (OPTIONS Request)');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(endpointUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.whatsapp.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-hub-signature-256',
      }
    });

    const data = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`Body:`, data || '(empty)');
    
    if (response.status === 405) {
      console.log('❌ OPTIONS not allowed - CORS might be the issue!\n');
      return false;
    } else if (response.ok || response.status === 204) {
      console.log('✅ OPTIONS Request PASSED\n');
      return true;
    } else {
      console.log('⚠️  Unexpected status:', response.status, '\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    healthCheck: await testHealthCheck(),
    ping: await testPingRequest(),
    signature: await testSignatureRequest(),
    options: await testOptionsRequest(),
  };

  console.log('================================================');
  console.log('Test Results Summary');
  console.log('================================================\n');
  
  console.log(`Health Check (GET):     ${results.healthCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Ping Request (POST):    ${results.ping ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Signature Test (POST):  ${results.signature ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CORS Preflight (OPTIONS): ${results.options ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED! Endpoint is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED! Check the details above.');
    console.log('\nCommon Issues:');
    console.log('- 405 Error: Route file might not export all needed methods');
    console.log('- CORS Error: Missing OPTIONS handler or CORS headers');
    console.log('- Connection Error: Server not running or wrong URL');
  }
  console.log('='.repeat(50) + '\n');
}

runAllTests().catch(console.error);
