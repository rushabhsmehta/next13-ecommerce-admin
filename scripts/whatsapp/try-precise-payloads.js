require('dotenv').config();
const https = require('https');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const TEMPLATE_LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const MEDIA_ID = process.env.MEDIA_ID || '';
const HEADER_IMAGE = process.env.HEADER_IMAGE || '';
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

// Buttons copied from the template raw JSON
const buttonsArray = [
  { type: 'PHONE_NUMBER', text: 'Call phone number', phone_number: '+919724444701' },
  { type: 'URL', text: 'VISIT WEBSITE', url: 'https://aagamholidays.com/' },
  { type: 'FLOW', text: 'INTERESTED', flow_id: 1529773194683122, flow_action: 'NAVIGATE', navigate_screen: 'QUESTION_ONE' }
];

const payloads = [];

// Variant 1: Exact uppercase component types and BUTTONS object included
payloads.push({
  name: 'Uppercase components + image id + BUTTONS object',
  payload: {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'HEADER', parameters: [ { type: 'image', image: { id: MEDIA_ID } } ] },
        { type: 'BODY', parameters: [] },
        { type: 'FOOTER', parameters: [] },
        { type: 'BUTTONS', buttons: buttonsArray }
      ]
    }
  }
});

// Variant 2: Lowercase types
payloads.push({
  name: 'Lowercase components + image id + buttons',
  payload: {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'header', parameters: [ { type: 'image', image: { id: MEDIA_ID } } ] },
        { type: 'body', parameters: [] },
        { type: 'footer', parameters: [] },
        { type: 'buttons', buttons: buttonsArray }
      ]
    }
  }
});

// Variant 3: Header using link instead of id
payloads.push({
  name: 'Header with link (image link)',
  payload: {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'HEADER', parameters: [ { type: 'image', image: { link: HEADER_IMAGE || 'https://images.pexels.com/photos/3974036/pexels-photo-3974036.jpeg' } } ] },
        { type: 'BODY', parameters: [] },
        { type: 'FOOTER', parameters: [] }
      ]
    }
  }
});

// Variant 4: Only header component (image id)
payloads.push({
  name: 'Only HEADER with image id',
  payload: {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [ { type: 'HEADER', parameters: [ { type: 'image', image: { id: MEDIA_ID } } ] } ]
    }
  }
});

// Variant 5: Send header as separate media message then template without components
async function sendMediaThenTemplate() {
  console.log('\n=== Variant: upload/send media message then template without components ===');
  // Send media message (image) to recipient
  const mediaPayload = {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'image',
    image: MEDIA_ID ? { id: MEDIA_ID } : { link: HEADER_IMAGE }
  };
  const bodyMedia = JSON.stringify(mediaPayload);
  const optionsMedia = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
  };
  const resMedia = await requestJson(optionsMedia, bodyMedia);
  console.log('Media message result:', resMedia.status, JSON.stringify(resMedia.body, null, 2));

  // Now send template without components
  const tplPayload = {
    messaging_product: 'whatsapp',
    to: TO,
    type: 'template',
    template: { name: TEMPLATE_NAME, language: { code: TEMPLATE_LANGUAGE } }
  };
  const bodyTpl = JSON.stringify(tplPayload);
  const optionsTpl = { ...optionsMedia };
  const resTpl = await requestJson(optionsTpl, bodyTpl);
  console.log('Template after media result:', resTpl.status, JSON.stringify(resTpl.body, null, 2));
}

(async () => {
  for (const p of payloads) {
    console.log('\n=== Trying payload:', p.name, '===');
    const body = JSON.stringify(p.payload);
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await requestJson(options, body);
      console.log('Result for', p.name, ':', res.status, JSON.stringify(res.body, null, 2));
    } catch (err) {
      console.error('Error for', p.name, err && err.message ? err.message : err);
    }

    // small delay
    await new Promise((r) => setTimeout(r, 800));
  }

  // Try media then template flow
  try {
    await sendMediaThenTemplate();
  } catch (err) {
    console.error('Error during media->template flow:', err && err.message ? err.message : err);
  }

  console.log('\nAll trials finished');
})();
