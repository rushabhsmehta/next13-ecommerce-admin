#!/usr/bin/env node
// Find 'welcome_message' Content SID, check WhatsApp approval status, and send to a recipient if approved.

const path = require('path');
const fs = require('fs');
require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER;
const client = twilio(accountSid, authToken);

if (!accountSid || !authToken || !fromRaw) {
  console.error('Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_NUMBER in .env');
  process.exit(2);
}

const recipient = process.argv[2] || '+919978783238';

(async () => {
  try {
    // List contents and find friendlyName welcome_message
    const contents = await client.content.v1.contents.list({ limit: 50 });
    const match = contents.find(c => c.friendlyName === 'welcome_message' || c.sid === 'welcome_message');
    if (!match) {
      console.error('Could not find content with friendlyName welcome_message. Use create-twilio-templates.js to create it first.');
      process.exit(1);
    }

    console.log('Found content:', match.sid);

    // Check approval status using helper from create-twilio-templates.js
    const { checkTemplateStatus } = require('./create-twilio-templates');
    const status = await checkTemplateStatus(match.sid);
    console.log('WhatsApp approval status:', status);

    if (status !== 'approved') {
      console.error('Template not approved for WhatsApp yet. Current status:', status);
      process.exit(1);
    }

    // Prepare send - Twilio Content API for sending messages uses Messaging API with contentSid reference
    const fixedFrom = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;
    const fixedTo = recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`;

    // Send the template message using the Messaging API with contentSid (template)
    // Note: Twilio currently supports sending content via `contentSid` parameter in the create message call
    const msg = await client.messages.create({
      from: fixedFrom,
      to: fixedTo,
      contentSid: match.sid
    });

    console.log('Message sent. SID:', msg.sid, 'Status:', msg.status);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
