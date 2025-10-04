// Test script for Meta WhatsApp Graph API Integration
// Run with: node scripts/whatsapp/test-meta-whatsapp.js

require('dotenv').config();

async function testMetaWhatsApp() {
  console.log('🧪 Testing Meta WhatsApp Graph API Integration...\n');

  // Check environment variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = {
    'META_WHATSAPP_PHONE_NUMBER_ID': process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    'META_WHATSAPP_ACCESS_TOKEN': process.env.META_WHATSAPP_ACCESS_TOKEN,
  };

  let allConfigured = true;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (value) {
      console.log(`   ✅ ${key}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ ${key}: Not configured`);
      allConfigured = false;
    }
  }

  // Optional variables
  const optionalEnvVars = {
    'META_GRAPH_API_VERSION': process.env.META_GRAPH_API_VERSION || 'v22.0 (default)',
  };

  console.log('\n   Optional variables:');
  for (const [key, value] of Object.entries(optionalEnvVars)) {
    console.log(`   ℹ️  ${key}: ${value}`);
  }

  if (!allConfigured) {
    console.log('\n❌ Missing required environment variables. Please configure them in .env or .env.local');
    console.log('\nRequired variables:');
    console.log('  META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id');
    console.log('  META_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token');
    console.log('\nOptional variables:');
    console.log('  META_GRAPH_API_VERSION=v22.0  # defaults to v22.0');
    return;
  }

  // Test direct API call
  console.log('\n2. Testing direct Meta Graph API call...');
  try {
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';
    const testPhoneNumber = '919978783238'; // Change to your test number

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      to: testPhoneNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    console.log(`   Making POST request to: ${url}`);
    console.log(`   Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && !data.error) {
      console.log('   ✅ Message sent successfully via Meta Graph API!');
      console.log('   Message ID:', data.messages?.[0]?.id || data.id);
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('   ❌ Failed to send message:');
      console.log('   Status:', response.status);
      console.log('   Error:', data.error || data);
    }
  } catch (error) {
    console.log('   ❌ Direct API test failed:', error.message);
  }

  // Test through local API endpoint
  console.log('\n3. Testing through local API endpoint...');
  console.log('   (Make sure your Next.js server is running on http://localhost:3000)');
  
  try {
    const testMessage = {
      to: '+919978783238', // Change to your test number
      templateParams: [], // Empty for hello_world template
      campaignName: 'hello_world',
      saveToDb: true,
    };

    const apiResponse = await fetch('http://localhost:3000/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    const result = await apiResponse.json();

    if (result.success) {
      console.log('   ✅ Message sent through API endpoint!');
      console.log('   Message SID:', result.messageSid);
      console.log('   Provider:', result.provider);
      console.log('   DB Record:', result.dbRecord ? 'Saved' : 'Not saved');
    } else {
      console.log('   ❌ API endpoint test failed:', result.error);
    }
  } catch (error) {
    console.log('   ❌ API endpoint test failed:', error.message);
    console.log('   Note: This is expected if the server is not running');
  }

  console.log('\n🎉 Meta WhatsApp Graph API test completed!');
  console.log('\n📝 Integration Summary:');
  console.log('   - The system uses Meta WhatsApp Cloud API exclusively');
  console.log('   - All API endpoints work with Meta provider');
  console.log('   - Messages are saved to the database with provider info');
}

testMetaWhatsApp().catch(console.error);
