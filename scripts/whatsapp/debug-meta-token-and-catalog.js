const fetch = require('node-fetch');
require('dotenv').config();

const token = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const appId = process.env.META_APP_ID || '';
const appSecret = process.env.META_APP_SECRET || '';
const businessId = process.env.META_WHATSAPP_BUSINESS_ID || process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const businessManagerId = process.env.META_BUSINESS_MANAGER_ID || '';
const catalogId = process.env.WHATSAPP_CATALOG_ID || '';
const version = process.env.META_GRAPH_API_VERSION || 'v22.0';

if (!token) {
  console.error('META_WHATSAPP_ACCESS_TOKEN is missing in your environment.');
  process.exit(1);
}

async function debugToken() {
  if (!appId || !appSecret) {
    console.warn('META_APP_ID or META_APP_SECRET missing; skipping /debug_token with app token.');
    return null;
  }
  const appAccess = `${appId}|${appSecret}`;
  const url = `https://graph.facebook.com/${version}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(appAccess)}`;
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, body: json };
}

async function getBusinessCatalogs() {
  // Prefer Business Manager endpoint if provided
  if (businessManagerId) {
    const url = `https://graph.facebook.com/${version}/${businessManagerId}/owned_product_catalogs?fields=id,name,owner_business&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = await res.json();
    return { status: res.status, body: json };
  }

  if (!businessId) {
    console.warn('Business id missing; skipping business catalogs check.');
    return null;
  }

  const url = `https://graph.facebook.com/${version}/${businessId}/owned_product_catalogs?fields=id,name,owner_business&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, body: json };
}

async function getCatalog() {
  if (!catalogId) {
    console.warn('WHATSAPP_CATALOG_ID missing; skipping catalog GET.');
    return null;
  }
  const url = `https://graph.facebook.com/${version}/${catalogId}?fields=id,name,owner_business&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, body: json };
}

async function getCatalogBasic() {
  if (!catalogId) {
    console.warn('WHATSAPP_CATALOG_ID missing; skipping basic catalog GET.');
    return null;
  }
  const url = `https://graph.facebook.com/${version}/${catalogId}?fields=id,name&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, body: json };
}

(async function main(){
  console.log('Running Meta token & catalog diagnostics...');
  console.log('Using Graph API version:', version);
  console.log('Business ID:', businessId || '(none)');
  console.log('Catalog ID:', catalogId || '(none)');

  try {
    const debug = await debugToken();
    console.log('\n=== /debug_token response ===');
    console.log(JSON.stringify(debug, null, 2));

  const biz = await getBusinessCatalogs();
  console.log('\n=== Business owned_product_catalogs response ===');
  console.log(JSON.stringify(biz, null, 2));

  const cat = await getCatalog();
  console.log('\n=== Catalog GET response ===');
  console.log(JSON.stringify(cat, null, 2));

  const basic = await getCatalogBasic();
  console.log('\n=== Catalog basic GET response ===');
  console.log(JSON.stringify(basic, null, 2));

    console.log('\nDiagnostics complete.');
  } catch (err) {
    console.error('Error during diagnostics:', err);
    process.exit(1);
  }
})();
