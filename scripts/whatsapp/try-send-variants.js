require('dotenv').config();
const https = require('https');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const TEMPLATE_LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const MEDIA_ID = process.env.MEDIA_ID || '';
const TO = process.env.TO || '';

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !MEDIA_ID || !TO) {
  console.error('Require META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID, MEDIA_ID and TO env vars');
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

async function sendVariant(headerType, imageParamType) {
  const payload = {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        {
          type: headerType,
          parameters: [
            {
              type: imageParamType,
              image: { id: MEDIA_ID }
            }
          ]
        }
      ]
    }
  };

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    }
  };

  console.log('Trying headerType=', headerType, 'imageParamType=', imageParamType);
  const res = await requestJson(options, JSON.stringify(payload));
  console.log('Result:', res.status, JSON.stringify(res.body, null, 2));
  return res;
}

(async () => {
  await sendVariant('header', 'image');
  await sendVariant('HEADER', 'IMAGE');
  await sendVariant('header', 'IMAGE');
  await sendVariant('HEADER', 'image');
})();
