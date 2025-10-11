/**
 * Check if a customer is within the 24-hour messaging window
 * Usage: node scripts/whatsapp/check-messaging-window.js +919978783238
 */

const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('❌ Please provide a phone number');
  console.log('Usage: node scripts/whatsapp/check-messaging-window.js +919978783238');
  process.exit(1);
}

// Get the base URL from environment or use localhost
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const apiUrl = `${baseUrl}/api/whatsapp/send-message?to=${encodeURIComponent(phoneNumber)}`;

console.log(`\n🔍 Checking messaging window for ${phoneNumber}...\n`);

fetch(apiUrl, {
  method: 'GET',
  headers: {
    // Add authentication if needed
    // 'Authorization': 'Bearer YOUR_TOKEN',
  },
})
  .then(async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data.error);
      console.error('Details:', data.details);
      process.exit(1);
    }

    console.log('📊 Status:');
    console.log(`   Can Message: ${data.canMessage ? '✅ YES' : '❌ NO'}`);
    
    if (data.hoursRemaining) {
      console.log(`   Time Remaining: ${data.hoursRemaining.toFixed(1)} hours`);
      console.log(`   Expires: ${new Date(Date.now() + data.hoursRemaining * 60 * 60 * 1000).toLocaleString()}`);
    }
    
    if (data.lastInboundMessage) {
      console.log('\n📬 Last Inbound Message:');
      console.log(`   Time: ${new Date(data.lastInboundMessage.createdAt).toLocaleString()}`);
      console.log(`   Message: ${data.lastInboundMessage.message?.substring(0, 100) || 'N/A'}`);
    }
    
    console.log(`\n💡 Recommendation: ${data.recommendation}\n`);
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  });
