#!/usr/bin/env node

/**
 * Test Twilio WhatsApp Template Sender
 * 
 * Usage: node test-send-template.js [contentSid] [phoneNumber]
 */

const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendTemplateMessage(contentSid, toNumber, variables = {}) {
  try {
    console.log(`📤 Sending template ${contentSid} to ${toNumber}`);
    
    const messageData = {
      contentSid: contentSid,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${toNumber}`,
    };

    if (Object.keys(variables).length > 0) {
      messageData.contentVariables = JSON.stringify(variables);
      console.log(`🔄 Using variables:`, variables);
    }

    const message = await client.messages.create(messageData);

    console.log(`✅ Message sent successfully!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   To: ${message.to}`);
    console.log(`   From: ${message.from}`);
    
    return message;
  } catch (error) {
    console.error(`❌ Failed to send message:`, error.message);
    return null;
  }
}

async function listTemplates() {
  try {
    console.log('📋 Fetching available templates...\n');
    
    const contents = await client.content.v1.contents.list({ limit: 20 });
    
    if (contents.length === 0) {
      console.log('No templates found. Create some templates first!');
      return;
    }

    console.log(`Found ${contents.length} templates:\n`);
    
    contents.forEach((content, index) => {
      console.log(`${index + 1}. ${content.friendlyName} (${content.sid})`);
      console.log(`   Language: ${content.language}`);
      console.log(`   Created: ${content.dateCreated}`);
      
      if (content.types['twilio/text']) {
        console.log(`   Body: ${content.types['twilio/text'].body}`);
      }
      
      if (content.variables && Object.keys(content.variables).length > 0) {
        console.log(`   Variables: ${Object.keys(content.variables).join(', ')}`);
      }
      
      console.log('');
    });
    
    return contents;
  } catch (error) {
    console.error('❌ Failed to fetch templates:', error.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Twilio credentials not found in environment variables');
    console.log('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
    process.exit(1);
  }

  if (!process.env.TWILIO_WHATSAPP_NUMBER) {
    console.error('❌ TWILIO_WHATSAPP_NUMBER not found in environment variables');
    process.exit(1);
  }

  if (args.length === 0) {
    console.log('🔍 No arguments provided. Listing available templates...\n');
    await listTemplates();
    console.log('💡 Usage: node test-send-template.js [contentSid] [phoneNumber]');
    console.log('   Example: node test-send-template.js HXxxxx +919724444701');
    return;
  }

  if (args.length < 2) {
    console.error('❌ Please provide both contentSid and phone number');
    console.log('Usage: node test-send-template.js [contentSid] [phoneNumber]');
    process.exit(1);
  }

  const [contentSid, phoneNumber] = args;
  
  // Example variables - you can modify these based on your template
  const variables = {
    1: 'John Doe',
    2: 'Goa Beach Package',
    3: 'December 25, 2024',
    4: 'BK123456'
  };

  await sendTemplateMessage(contentSid, phoneNumber, variables);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { sendTemplateMessage, listTemplates };
