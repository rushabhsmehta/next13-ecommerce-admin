// send-whatsapp.js
require('dotenv').config();
const Twilio = require('twilio');

async function main() {
  const [,, toArg, ...msgParts] = process.argv;
  const messageText = msgParts.join(' ');

  if (!toArg || !messageText) {
    console.error('Usage: node send-whatsapp.js +9199xxxxxxx "Your message here"');
    process.exit(1);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const rawFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !rawFrom) {
    console.error('Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_NUMBER in .env');
    process.exit(2);
  }

  const client = Twilio(accountSid, authToken);

  // Sanitize common mistakes in TWILIO_WHATSAPP_NUMBER
  let fixedFrom = rawFrom.trim();
  // fix common typo 'whatsapps:' -> 'whatsapp:'
  fixedFrom = fixedFrom.replace(/^whatsapps:/i, 'whatsapp:');
  // remove duplicate prefixes like 'whatsapp:whatsapp:' or 'whatsapp:whatsapps:'
  fixedFrom = fixedFrom.replace(/^(?:whatsapp:)+/i, 'whatsapp:');
  // ensure prefix
  if (!/^whatsapp:/i.test(fixedFrom)) fixedFrom = `whatsapp:${fixedFrom}`;

  // sanitize 'to' argument similarly
  let fixedTo = String(toArg).trim();
  fixedTo = fixedTo.replace(/^whatsapps:/i, 'whatsapp:');
  fixedTo = fixedTo.replace(/^(?:whatsapp:)+/i, 'whatsapp:');
  if (!/^whatsapp:/i.test(fixedTo)) fixedTo = `whatsapp:${fixedTo}`;

  try {
    const msg = await client.messages.create({
      from: fixedFrom,
      to: fixedTo,
      body: messageText,
    });
    console.log('Message sent. SID:', msg.sid, 'Status:', msg.status);
  } catch (err) {
    console.error('Failed to send message:', err.message || err);
    process.exit(3);
  }
}

main();
