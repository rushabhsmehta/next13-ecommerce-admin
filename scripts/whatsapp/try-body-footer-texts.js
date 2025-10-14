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

const bodyText = `Experience the magic of snowfall with our Luxury Kashmir Packages starting from \u20B927,500/- onwards\n\n✅ Luxury Accommodation\n✅ Breakfast & Dinner Included\n✅ Private Luxury Vehicle\n✅ Professional Driver\n✅ All Sightseeing\n✅ 24/7 Assistance & Support\n\n📞 Book Now with Aagam Holidays\n+91 97244 44701\n🌐 www.aagamholidays.com`;

const footerText = 'AAGAM HOLIDAYS';

const variants = [
  {
    name: 'header + body (body.text provided) + footer (footer.text provided)',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { id: MEDIA_ID } }] },
        { type: 'body', text: bodyText },
        { type: 'footer', text: footerText }
      ]
    }
  },
  {
    name: 'header + body (body.text only, no footer)',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { id: MEDIA_ID } }] },
        { type: 'body', text: bodyText }
      ]
    }
  },
  {
    name: 'body.text only (no header)',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [ { type: 'body', text: bodyText } ]
    }
  }
];

(async () => {
  for (const v of variants) {
    console.log('\n=== Trying variant:', v.name, '===');
    const payload = { messaging_product: 'whatsapp', to: TO, type: 'template', template: v.template };
    const options = { hostname: 'graph.facebook.com', port: 443, path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, method: 'POST', headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' } };
    try {
      const res = await requestJson(options, JSON.stringify(payload));
      console.log('Result:', res.status, JSON.stringify(res.body, null, 2));
    } catch (err) {
      console.error('Error:', err && err.message ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('\nDone');
})();
