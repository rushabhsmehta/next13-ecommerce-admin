require('dotenv').config();

const vars = [
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_WHATSAPP_BUSINESS_ID',
  'META_GRAPH_API_VERSION',
  'TEMPLATE_NAME',
  'TEMPLATE_LANGUAGE',
  'MEDIA_ID',
  'HEADER_IMAGE',
  'TO',
  'RECIPIENTS'
];

const out = {};
for (const v of vars) {
  const val = process.env[v];
  out[v] = val ? (v === 'META_WHATSAPP_ACCESS_TOKEN' ? 'Present' : val) : 'Missing';
}

console.log(JSON.stringify(out, null, 2));
