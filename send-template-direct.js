#!/usr/bin/env node

/**
 * Send an AiSensy campaign message (template-based) directly from the CLI.
 * This bypasses the Next.js API and hits AiSensy using environment credentials.
 */

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
  const [toArg] = positional;
  const templateName = options.template || options.campaign || process.env.AISENSY_DEFAULT_CAMPAIGN_NAME || process.env.AISENSY_DEFAULT_CAMPAIGN;

  if (!toArg || !templateName) {
    console.error('Usage: node send-template-direct.js +9199xxxxxxx --template=my_campaign --param="John" --param="24 Aug"');
    process.exit(1);
  }

  const apiKey = process.env.AISENSY_API_KEY;
  if (!apiKey) {
    console.error('Missing AISENSY_API_KEY in environment');
    process.exit(2);
  }

  const destination = ensureE164(toArg);
  const templateParams = [];

  const rawParams = ([]).concat(options.param || options.params || options.templateParam || []);
  rawParams.forEach(value => {
    if (value && value !== true) templateParams.push(String(value));
  });

  const payload = {
    apiKey,
    campaignName: templateName,
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
  if (Object.keys(attributes).length) payload.attributes = attributes;

  try {
    console.log('� Sending AiSensy campaign request...');
    console.log('Campaign:', templateName);
    console.log('Destination:', destination);
    if (templateParams.length) console.log('Template params:', templateParams.join(', '));

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
    console.log('✅ AiSensy request accepted');
    if (messageId) console.log('Reference:', messageId);
    if (data?.data?.whatsAppNumber) console.log('Sender:', data.data.whatsAppNumber);
  } catch (error) {
    console.error('❌ Failed to send AiSensy campaign message:', error.message || error);
    process.exit(3);
  }
}

main();
