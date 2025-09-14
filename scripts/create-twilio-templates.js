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

// Common template definitions following WhatsApp guidelines
const templates = [
  {
    friendlyName: 'booking_confirmation',
    templateName: 'booking_confirmation', // WhatsApp template name (lowercase, underscores only)
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Service', 3: 'Date', 4: 'Reference' },
    body: 'Hello {{1}}, your booking for {{2}} has been confirmed for {{3}}. Reference: {{4}}. Thank you for choosing us.',
    category: 'UTILITY',
    sampleValues: ['John Doe', 'Spa Service', '2025-07-20', 'BK123456']
  },
  {
    friendlyName: 'payment_reminder',
    templateName: 'payment_reminder',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Amount', 3: 'Due Date' },
    body: 'Hi {{1}}, your payment of ₹{{2}} is due on {{3}}. Please complete your payment to avoid any inconvenience. Thank you.',
    category: 'UTILITY',
    sampleValues: ['Jane Smith', '5000', '2025-07-25']
  },
  {
    friendlyName: 'welcome_message',
    templateName: 'welcome_message',
    language: 'en',
    variables: { 1: 'Customer Name' },
    body: 'Hello {{1}}, welcome to Aagam Holidays! We are excited to help you plan your perfect getaway. Feel free to reach out anytime for assistance.',
    category: 'MARKETING',
    sampleValues: ['Alice Johnson']
  },
  {
    friendlyName: 'trip_update',
    templateName: 'trip_update',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Destination', 3: 'Date' },
    body: 'Hi {{1}}, we have an important update regarding your trip to {{2}} scheduled for {{3}}. Please check your email for details.',
    category: 'UTILITY',
    sampleValues: ['Bob Wilson', 'Paris', '2025-08-01']
  },
  {
    friendlyName: 'payment_received',
    templateName: 'payment_received',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Amount', 3: 'Reference' },
    body: 'Thank you {{1}}! We have received your payment of ₹{{2}} for booking {{3}}. Your booking is now confirmed.',
    category: 'UTILITY',
    sampleValues: ['Chloe Davis', '7500', 'BK789012']
  },
  {
    friendlyName: 'birthday_special',
    templateName: 'birthday_special',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Discount' },
    body: 'Happy Birthday {{1}}! 🎉 Celebrate with our special birthday discount of {{2}}% on your next booking. Valid for 7 days only.',
    category: 'MARKETING',
    sampleValues: ['Dana Brown', '15']
  },
  {
    friendlyName: 'feedback_request',
    templateName: 'feedback_request',
    language: 'en',
    variables: { 1: 'Customer Name', 2: 'Trip' },
    body: 'Hi {{1}}, we hope you enjoyed your {{2}} experience with us! Please share your feedback to help us improve our services.',
    category: 'UTILITY',
    sampleValues: ['Evan Taylor', 'Safari Tour']
  },
  {
    friendlyName: 'otp_verification',
    templateName: 'otp_verification',
    language: 'en',
    variables: { 1: 'OTP Code', 2: 'Validity' },
    body: 'Your OTP code is {{1}}. This code is valid for {{2}} minutes. Please do not share this code with anyone.',
    category: 'AUTHENTICATION',
    sampleValues: ['123456', '10']
  }
];

// Validation function for template data
function validateTemplate(templateData) {
  const errors = [];
  
  // Check template name format (lowercase, alphanumeric, underscores only)
  if (!/^[a-z0-9_]+$/.test(templateData.templateName)) {
    errors.push(`Template name "${templateData.templateName}" must be lowercase alphanumeric with underscores only`);
  }
  
  // Check if template starts and ends with static text
  if (templateData.body.trim().startsWith('{{') || templateData.body.trim().endsWith('}}')) {
    errors.push(`Template body cannot start or end with a placeholder`);
  }
  
  // Check for sequential placeholder numbering
  const placeholders = templateData.body.match(/\{\{(\d+)\}\}/g) || [];
  const placeholderNumbers = placeholders.map(p => parseInt(p.replace(/[{}]/g, '')));
  const sortedNumbers = [...placeholderNumbers].sort((a, b) => a - b);
  
  for (let i = 0; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] !== i + 1) {
      errors.push(`Placeholder numbering must be sequential starting from 1`);
      break;
    }
  }
  
  // Check for adjacent placeholders
  if (templateData.body.includes('}}{{')) {
    errors.push(`Cannot have adjacent placeholders without separating text`);
  }
  
  // Check sample values count matches placeholders
  if (templateData.sampleValues && templateData.sampleValues.length !== placeholderNumbers.length) {
    errors.push(`Sample values count (${templateData.sampleValues.length}) must match placeholder count (${placeholderNumbers.length})`);
  }
  
  return errors;
}

async function createTemplate(templateData) {
  try {
    console.log(`\n📝 Creating template: ${templateData.templateName}`);
    
    // Validate template data
    const validationErrors = validateTemplate(templateData);
    if (validationErrors.length > 0) {
      console.error(`❌ Validation failed for ${templateData.templateName}:`);
      validationErrors.forEach(error => console.error(`  - ${error}`));
      return null;
    }
    
    // Create content template in Twilio
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

    console.log(`✅ Template created with Content SID: ${content.sid}`);

    // Submit for WhatsApp approval with sample values
    if (templateData.category) {
      try {
        const approvalParams = {
          name: templateData.templateName, // Use WhatsApp template name
          category: templateData.category
        };
        
        // Add sample values if provided
        if (templateData.sampleValues && templateData.sampleValues.length > 0) {
          approvalParams.sampleValues = templateData.sampleValues;
        }
        
        const approval = await client.content.v1
          .contents(content.sid)
          .approvalRequests('whatsapp')
          .create(approvalParams);
        
        console.log(`📋 Submitted for WhatsApp approval: ${approval.status}`);
        console.log(`📋 Template name in WhatsApp: ${templateData.templateName}`);
        
        if (templateData.sampleValues) {
          console.log(`📋 Sample values provided: ${templateData.sampleValues.join(', ')}`);
        }
      } catch (approvalError) {
        console.log(`⚠️  Failed to submit for approval: ${approvalError.message}`);
      }
    }

    return {
      contentSid: content.sid,
      templateName: templateData.templateName,
      friendlyName: templateData.friendlyName,
      category: templateData.category,
      language: templateData.language,
      status: 'pending'
    };
  } catch (error) {
    console.error(`❌ Failed to create template ${templateData.templateName}:`, error.message);
    return null;
  }
}

// Function to check template approval status
async function checkTemplateStatus(contentSid) {
  try {
    const approvalRequests = await client.content.v1
      .contents(contentSid)
      .approvalRequests
      .list();
    
    const whatsappApproval = approvalRequests.find(req => req.name === 'whatsapp');
    return whatsappApproval ? whatsappApproval.status : 'unknown';
  } catch (error) {
    console.error(`Failed to check status for ${contentSid}:`, error.message);
    return 'error';
  }
}

async function createAllTemplates() {
  console.log('🚀 Creating Twilio WhatsApp templates following best practices...\n');
  console.log('📋 Guidelines being followed:');
  console.log('  • Template names: lowercase, alphanumeric, underscores only');
  console.log('  • Sequential placeholder numbering ({{1}}, {{2}}, etc.)');
  console.log('  • No adjacent placeholders without separating text');
  console.log('  • Templates start and end with static text');
  console.log('  • Sample values provided for WhatsApp review');
  console.log('  • Appropriate categories (UTILITY, MARKETING, AUTHENTICATION)');
  console.log('');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Twilio credentials not found in environment variables');
    console.log('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
    process.exit(1);
  }

  const results = [];
  
  for (const template of templates) {
    const result = await createTemplate(template);
    if (result) {
      results.push(result);
    }
    
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${results.length}/${templates.length} templates`);
  
  if (results.length > 0) {
    console.log('\n📋 Created templates:');
    results.forEach(result => {
      console.log(`  • ${result.templateName} (${result.contentSid}) - ${result.category}`);
    });
    
    console.log('\n📝 Next steps:');
    console.log('1. Check WhatsApp approval status in Twilio Console');
    console.log('2. Monitor approval status via Content API');
    console.log('3. Use Content SIDs to send template messages once approved');
    console.log('4. Store template metadata in your database for reference');
    console.log('\n💡 Pro tip: WhatsApp approval usually takes minutes to hours');
    console.log('💡 Check status with: node -e "require(\'./create-twilio-templates.js\').checkStatus(\'HX...\')"');
  }
  
  return results;
}

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);
  // Simple CLI: --status-sid <sid> or --status-name <templateName>
  if (args[0] === '--status-sid' && args[1]) {
    (async () => {
      const sid = args[1];
      console.log(`🔎 Checking status for Content SID: ${sid}`);
      const s = await checkTemplateStatus(sid);
      console.log(`Status: ${s}`);
      process.exit(0);
    })();
  } else if (args[0] === '--status-name' && args[1]) {
    (async () => {
      const name = args[1];
      console.log(`🔎 Looking up template by name: ${name}`);
      try {
        const contents = await client.content.v1.contents.list({ limit: 50 });
        const match = contents.find(c => c.friendlyName === name || c.sid === name);
        if (!match) {
          console.log('Not found');
          process.exit(0);
        }
        const s = await checkTemplateStatus(match.sid);
        console.log(`Found: ${match.sid} — Status: ${s}`);
      } catch (e) {
        console.error('Error while querying content list:', e.message);
      }
      process.exit(0);
    })();
  } else {
    createAllTemplates()
      .then(results => {
        console.log('\n🎉 Template creation process completed!');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Template creation failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { 
  createTemplate, 
  createAllTemplates, 
  checkTemplateStatus, 
  validateTemplate,
  templates 
};
