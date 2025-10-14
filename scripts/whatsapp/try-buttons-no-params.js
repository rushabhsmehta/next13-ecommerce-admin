require('dotenv').config();
const https = require('https');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const TEMPLATE_LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const MEDIA_ID = process.env.MEDIA_ID || '';
const TO = process.env.TO || '';

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !TO) {
  console.error('Please set META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID and TO');
  process.exit(1);
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

const components = [
  { type: 'header', parameters: [ { type: 'image', image: { id: MEDIA_ID } } ] },
  // Attempt to include URL and FLOW buttons only, no parameters
  { type: 'button', sub_type: 'URL', index: 1 },
  { type: 'button', sub_type: 'FLOW', index: 2 }
];

const payload = { messaging_product: 'whatsapp', to: TO, type: 'template', template: { name: TEMPLATE_NAME, language: { code: TEMPLATE_LANGUAGE }, components } };

(async () => {
  try {
    console.log('Sending components:', JSON.stringify(components, null, 2));
    const body = JSON.stringify(payload);
    const options = { hostname: 'graph.facebook.com', port: 443, path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } };
    const res = await requestJson(options, body);
    console.log('Result:', res.status, JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
  }
})();
