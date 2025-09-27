// send-whatsapp.js
require('dotenv').config();
const fetch = require('node-fetch');

const AISENSY_ENDPOINT = (process.env.AISENSY_API_BASE || 'https://backend.aisensy.com').replace(/\/$/, '') + '/campaign/t1/api/v2';

function parseArgs(raw) {
  const positional = [];
  const options = {};
  raw.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      const value = rest.length ? rest.join('=') : true;
      if (options[key] === undefined) {
        options[key] = value;
      } else if (Array.isArray(options[key])) {
        options[key].push(value);
      } else {
        options[key] = [options[key], value];
      }
    } else {
      positional.push(arg);
    }
  });
  return { positional, options };
}

function ensureE164(input) {
  if (!input) return input;
  const trimmed = String(input).trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return trimmed;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [toArg, ...messageParts] = positional;
  const messageText = messageParts.join(' ');

  if (!toArg || (!messageText && !options.templateParam)) {
    console.error('Usage: node send-whatsapp.js +9199xxxxxxx "Your message here" [--campaign=Name] [--tag=vip --tag=promo] [--attr.city=Surat]');
    process.exit(1);
  }

  const apiKey = process.env.AISENSY_API_KEY;
  const defaultCampaign = process.env.AISENSY_DEFAULT_CAMPAIGN_NAME || process.env.AISENSY_DEFAULT_CAMPAIGN;

  if (!apiKey || !defaultCampaign) {
    console.error('Missing AISENSY_API_KEY or AISENSY_DEFAULT_CAMPAIGN_NAME in environment');
    process.exit(2);
  }

  const campaignName = options.campaign || defaultCampaign;
  const destination = ensureE164(toArg);
  const templateParams = [];

  if (messageText) templateParams.push(messageText);
  if (Array.isArray(options.tag)) {
    // handled later
  }
  // Support repeated --templateParam=value flags
  Object.keys(options).forEach(key => {
    if (key === 'templateParam' || key.startsWith('templateParam')) {
      const value = options[key];
      if (Array.isArray(value)) {
        value.forEach(v => templateParams.push(String(v)));
      } else if (value && value !== true) {
        templateParams.push(String(value));
      }
    }
  });

  const payload = {
    apiKey,
    campaignName,
    destination,
    templateParams: templateParams.length ? templateParams : undefined,
  };

  if (options.userName) payload.userName = options.userName;
  if (options.source) payload.source = options.source;

  const cliTags = ([]).concat(options.tag || options.tags || []);
  if (cliTags.length) payload.tags = cliTags.map(String);

  const attributes = {};
  Object.entries(options).forEach(([key, value]) => {
    if (key.startsWith('attr.') && value !== true) {
      attributes[key.replace(/^attr\./, '')] = String(value);
    }
  });
  if (Object.keys(attributes).length > 0) payload.attributes = attributes;

  try {
    const res = await fetch(AISENSY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || String(data?.status || 'success').toLowerCase() === 'error') {
      throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
    }
    const messageId = data?.data?.messageId || data?.data?.id || data?.requestId || data?.messageId;
    console.log('Message enqueued via AiSensy');
    if (messageId) console.log('Reference:', messageId);
  } catch (err) {
    console.error('Failed to send message:', err.message || err);
    process.exit(3);
  }
}

main();
