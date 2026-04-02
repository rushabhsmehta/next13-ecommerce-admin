#!/usr/bin/env node

/**
 * WhatsApp Business Account ID - Usage Examples
 * Account ID: 1259119921508566
 */

require('dotenv').config();

const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

console.log('📊 WhatsApp Business Account ID - What It\'s Used For');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Business Account ID: ${BUSINESS_ACCOUNT_ID}\n`);

console.log('🎯 USE CASES:\n');

console.log('1. 📋 TEMPLATE MANAGEMENT');
console.log('   - List all message templates');
console.log('   - Get template details and status');
console.log('   - Create new templates');
console.log('   - Delete templates');
console.log(`   API: GET https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates`);
console.log('');

console.log('2. 📱 PHONE NUMBER MANAGEMENT');
console.log('   - List all phone numbers in your account');
console.log('   - Get phone number details');
console.log('   - Register/deregister numbers');
console.log(`   API: GET https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/phone_numbers`);
console.log('');

console.log('3. 📊 ANALYTICS & INSIGHTS');
console.log('   - Get conversation analytics');
console.log('   - Message delivery statistics');
console.log('   - Template performance metrics');
console.log(`   API: GET https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/conversation_analytics`);
console.log('');

console.log('4. 💬 CONVERSATION MANAGEMENT');
console.log('   - Get conversation counts');
console.log('   - Track message costs');
console.log('   - Monitor conversation windows');
console.log(`   API: GET https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/conversations`);
console.log('');

console.log('5. 👥 USER MANAGEMENT');
console.log('   - List users with access to account');
console.log('   - Manage permissions');
console.log(`   API: GET https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/assigned_users`);
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('📝 PRACTICAL EXAMPLES:\n');

// Example 1: List Templates
console.log('Example 1: List All Templates');
console.log('─────────────────────────────────────────────────────────');
const listTemplatesExample = {
  method: 'GET',
  url: `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates`,
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
};
console.log(JSON.stringify(listTemplatesExample, null, 2));
console.log('');

// Example 2: Get Phone Numbers
console.log('Example 2: List Phone Numbers');
console.log('─────────────────────────────────────────────────────────');
const listPhonesExample = {
  method: 'GET',
  url: `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/phone_numbers`,
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
};
console.log(JSON.stringify(listPhonesExample, null, 2));
console.log('');

// Example 3: Get Analytics
console.log('Example 3: Get Conversation Analytics');
console.log('─────────────────────────────────────────────────────────');
const analyticsExample = {
  method: 'GET',
  url: `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/conversation_analytics?start=1727740800&end=1728345600&granularity=DAILY`,
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  },
  note: 'start/end are Unix timestamps'
};
console.log(JSON.stringify(analyticsExample, null, 2));
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 NOTE:\n');
console.log('  • Phone Number ID (131371496722301) - Used for SENDING messages');
console.log('  • Business Account ID (1259119921508566) - Used for MANAGING account');
console.log('');
console.log('  For day-to-day message sending, you use Phone Number ID.');
console.log('  For admin tasks (templates, analytics, etc.), you use Business Account ID.');
console.log('═══════════════════════════════════════════════════════════');
