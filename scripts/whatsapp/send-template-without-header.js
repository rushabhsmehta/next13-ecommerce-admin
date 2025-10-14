require('dotenv').config();
const https = require('https');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';

const RECIPIENTS = process.env.RECIPIENTS
  ? process.env.RECIPIENTS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['+919978783238'];

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error('Please set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in your environment');
  process.exit(1);
}

function sendToRecipient(to) {
  return new Promise((resolve) => {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: { code: LANGUAGE },
        // do not provide components; let the template use its defined header/buttons
      },
    };

    const body = JSON.stringify(payload);

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (err) {
          // ignore
        }
        resolve({ status: res.statusCode, body: parsed || data });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: String(err) });
    });

    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('Sending template without extra components');
  for (const to of RECIPIENTS) {
    console.log('Sending to', to);
    const res = await sendToRecipient(to);
    console.log('Status:', res.status);
    console.log('Body:', JSON.stringify(res.body, null, 2));
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('Done');
})();
