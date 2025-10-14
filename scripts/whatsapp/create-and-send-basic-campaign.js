require('dotenv').config();
const https = require('https');

// Config: read from environment or set here
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error('Please set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in your environment');
  process.exit(1);
}

// Customize these for the campaign
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const HEADER_IMAGE = process.env.HEADER_IMAGE || 'https://images.pexels.com/photos/3974036/pexels-photo-3974036.jpeg';

// Recipients list - change as needed
const RECIPIENTS = process.env.RECIPIENTS
  ? process.env.RECIPIENTS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['+919978783238'];

function sendToRecipient(to) {
  return new Promise((resolve) => {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: { code: LANGUAGE },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: { link: HEADER_IMAGE },
              },
            ],
          },
        ],
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
  console.log('Starting basic campaign send');
  console.log('Template:', TEMPLATE_NAME, 'Language:', LANGUAGE);
  console.log('Recipients:', RECIPIENTS.join(', '));

  for (const to of RECIPIENTS) {
    console.log('\n---');
    console.log('Sending to', to);
    const res = await sendToRecipient(to);
    console.log('Result status:', res.status);
    console.log('Result body:', JSON.stringify(res.body, null, 2));
    // small delay between sends
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('\nFinished');
})();
