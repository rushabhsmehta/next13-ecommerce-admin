// Direct Meta WhatsApp API Test
// This mimics the exact curl command you provided
// Run with: node scripts/whatsapp/send-meta-direct.js

require('dotenv').config();

async function sendMetaWhatsAppDirect() {
  console.log('📱 Sending WhatsApp message via Meta Graph API (Direct)...\n');

  // Configuration from environment or defaults
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '131371496722301';
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v22.0';
  const toNumber = process.argv[2] || '919978783238'; // Can pass as argument
  const templateName = process.argv[3] || 'hello_world'; // Can pass as argument

  if (!accessToken) {
    console.error('❌ ERROR: META_WHATSAPP_ACCESS_TOKEN not found in environment');
    console.log('\nPlease set it in your .env or .env.local file:');
    console.log('META_WHATSAPP_ACCESS_TOKEN=your_token_here\n');
    return;
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: toNumber,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: 'en_US'
      }
    }
  };

  console.log('Configuration:');
  console.log(`  API URL: ${url}`);
  console.log(`  Phone Number ID: ${phoneNumberId}`);
  console.log(`  Access Token: ${accessToken.substring(0, 30)}...`);
  console.log(`  To: ${toNumber}`);
  console.log(`  Template: ${templateName}`);
  console.log('\nPayload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nSending...\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(`Response Status: ${response.status} ${response.statusText}\n`);

    if (response.ok && !data.error) {
      console.log('✅ SUCCESS! Message sent successfully!\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.messages && data.messages[0]) {
        console.log('\n📨 Message Details:');
        console.log(`  Message ID: ${data.messages[0].id}`);
        console.log(`  Message Status: ${data.messages[0].message_status || 'sent'}`);
      }

      console.log('\n🎉 The message should arrive on WhatsApp shortly!');
    } else {
      console.log('❌ FAILED! Error sending message:\n');
      console.log('Error Response:');
      console.log(JSON.stringify(data, null, 2));

      if (data.error) {
        console.log('\n📋 Error Details:');
        console.log(`  Code: ${data.error.code}`);
        console.log(`  Message: ${data.error.message}`);
        console.log(`  Type: ${data.error.type}`);
        if (data.error.error_user_msg) {
          console.log(`  User Message: ${data.error.error_user_msg}`);
        }
        if (data.error.error_user_title) {
          console.log(`  User Title: ${data.error.error_user_title}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ EXCEPTION! Failed to send message:\n');
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Usage: node scripts/whatsapp/send-meta-direct.js [phone] [template]');
  console.log('Examples:');
  console.log('  node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world');
  console.log('  node scripts/whatsapp/send-meta-direct.js 14155551234 booking_confirmation');
  console.log('='.repeat(60));
}

sendMetaWhatsAppDirect().catch(console.error);
