const fetch = require('node-fetch');
require('dotenv').config();

const catalogId = process.env.WHATSAPP_CATALOG_ID;
const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
const version = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!catalogId || !token) {
  console.error('Missing WHATSAPP_CATALOG_ID or META_WHATSAPP_ACCESS_TOKEN in environment.');
  process.exit(1);
}

async function main() {
  const url = `https://graph.facebook.com/${version}/${catalogId}?fields=id,name,owner_business&access_token=${token}`;
  console.log('Checking catalog:', catalogId);
  const res = await fetch(url);
  const json = await res.json();
  console.log('Status:', res.status);
  console.log(JSON.stringify(json, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
