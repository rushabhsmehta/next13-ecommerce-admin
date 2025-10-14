const https = require('https');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.META_WHATSAPP_BUSINESS_ID || '1163477029017210';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';

if (!ACCESS_TOKEN) {
  console.error('Please set META_WHATSAPP_ACCESS_TOKEN in your environment');
  process.exit(1);
}

function getTemplates() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: `/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,components,language,category&limit=50`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.data || []);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

(async () => {
  try {
    const templates = await getTemplates();
    const target = templates.find(t => t.name === TEMPLATE_NAME);
    if (!target) {
      console.error('Template not found. Found templates:', templates.map(t => t.name).join(', '));
      process.exit(1);
    }

    console.log('Raw template JSON:');
    console.log(JSON.stringify(target, null, 2));
  } catch (err) {
    console.error('Error fetching templates:', err);
    process.exit(1);
  }
})();
