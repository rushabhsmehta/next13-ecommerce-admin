#!/usr/bin/env node

/**
 * Twilio WhatsApp Template Creator
 * 
 * Run this script to create common WhatsApp templates using Twilio Content API
 * Usage: node create-twilio-templates.js
 */

const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Common template definitions
const templates = [
  {
    friendlyName: 'booking_confirmation',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Service', 3: 'Date', 4: 'Reference' },
    body: 'Hello {{1}}, your booking for {{2}} has been confirmed for {{3}}. Reference: {{4}}',
    category: 'UTILITY'
  },
  {
    friendlyName: 'payment_reminder',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Amount', 3: 'Due Date' },
    body: 'Hi {{1}}, your payment of ₹{{2}} is due on {{3}}. Please complete your payment to avoid any inconvenience.',
    category: 'UTILITY'
  },
  {
    friendlyName: 'welcome_message',
    language: 'en',
    variables: { 1: 'Customer Name' },
    body: 'Hello {{1}}, welcome to Aagam Holidays! We\'re excited to help you plan your perfect getaway. Feel free to reach out anytime for assistance.',
    category: 'MARKETING'
  },
  {
    friendlyName: 'trip_update',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Destination', 3: 'Date' },
    body: 'Hi {{1}}, we have an important update regarding your trip to {{2}} scheduled for {{3}}. Please check your email for details.',
    category: 'UTILITY'
  },
  {
    friendlyName: 'payment_received',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Amount', 3: 'Reference' },
    body: 'Thank you {{1}}! We have received your payment of ₹{{2}} for booking {{3}}. Your booking is now confirmed.',
    category: 'UTILITY'
  },
  {
    friendlyName: 'birthday_special',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Discount' },
    body: 'Happy Birthday {{1}}! 🎉 Celebrate with our special birthday discount of {{2}}% on your next booking. Valid for 7 days!',
    category: 'MARKETING'
  },
  {
    friendlyName: 'feedback_request',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Trip' },
    body: 'Hi {{1}}, we hope you enjoyed your {{2}} experience with us! Please share your feedback to help us improve our services.',
    category: 'UTILITY'
  }
];

async function createTemplate(templateData) {
  try {
    console.log(`Creating template: ${templateData.friendlyName}`);
    
    const content = await client.content.v1.contents.create({
      friendlyName: templateData.friendlyName,
      language: templateData.language,
      variables: templateData.variables,
      types: {
        'twilio/text': {
          body: templateData.body
        }
      }
    });

    console.log(`✅ Template created: ${content.sid}`);

    // Submit for WhatsApp approval
    if (templateData.category) {
      try {
        const approval = await client.content.v1
          .contents(content.sid)
          .approvalRequests('whatsapp')
          .create({
            name: templateData.friendlyName,
            category: templateData.category
          });
        
        console.log(`📋 Submitted for WhatsApp approval: ${approval.status}`);
      } catch (approvalError) {
        console.log(`⚠️  Failed to submit for approval: ${approvalError.message}`);
      }
    }

    return content;
  } catch (error) {
    console.error(`❌ Failed to create template ${templateData.friendlyName}:`, error.message);
    return null;
  }
}

async function createAllTemplates() {
  console.log('🚀 Creating Twilio WhatsApp templates...\n');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Twilio credentials not found in environment variables');
    console.log('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
    process.exit(1);
  }

  const results = [];
  
  for (const template of templates) {
    const result = await createTemplate(template);
    if (result) {
      results.push({
        name: template.friendlyName,
        sid: result.sid,
        category: template.category
      });
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${results.length}/${templates.length} templates`);
  
  if (results.length > 0) {
    console.log('\n📋 Created templates:');
    results.forEach(result => {
      console.log(`  • ${result.name} (${result.sid}) - ${result.category}`);
    });
    
    console.log('\n📝 Next steps:');
    console.log('1. Check WhatsApp approval status in Twilio Console');
    console.log('2. Use the Content SIDs to send template messages');
    console.log('3. Monitor approval status via API or Console');
  }
}

// Run the script
if (require.main === module) {
  createAllTemplates().catch(console.error);
}

module.exports = { createTemplate, templates };
