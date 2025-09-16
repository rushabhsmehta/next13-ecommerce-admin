#!/usr/bin/env node
// Submit a simple Hello World WhatsApp template (via existing create-twilio-templates.js) and optionally send once approved.

const { createTemplate, checkTemplateStatus } = require('./create-twilio-templates');
const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const helloTemplate = {
  friendlyName: 'hello_world',
  templateName: 'hello_world',
  language: 'en',
  variables: {},
  body: 'Hello World!',
  category: 'UTILITY',
  sampleValues: []
};

(async () => {
  try {
    console.log('Submitting Hello World template...');
    const res = await createTemplate(helloTemplate);
    if (!res) {
      console.error('Template submission failed or validation errors occurred.');
      process.exit(1);
    }
    console.log('Submitted. Content SID:', res.contentSid);
    console.log('Template name:', res.templateName);
    console.log('Note: WhatsApp template approval may take time. Check status with:');
    console.log(`  node create-twilio-templates.js --status-sid ${res.contentSid}`);

    // If you want to send the template immediately (only works when approved), run the send flow separately.
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
