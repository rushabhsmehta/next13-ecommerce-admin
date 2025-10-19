#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { setTimeout: sleep } = require('timers/promises');

async function lazyFetch(...args) {
  const mod = await import('node-fetch');
  return mod.default(...args);
}

function toE164(input) {
  if (!input) return input;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return input;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith('9') ? `+${digits}` : `+${digits}`;
}

function loadVariablesFromFile(filePath) {
  if (!filePath) return undefined;
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Variables file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

function buildFlowButtonParameter(index, defaults) {
  const parameter = {
    type: 'flow',
    flow_token: `flow-${Date.now()}-${index}`,
    flow_message_version: '3',
    flow_action: 'navigate',
  };

  if (defaults) {
    const action = defaults.action || defaults;
    if (action && typeof action === 'object') {
      if (action.flow_id) parameter.flow_id = action.flow_id;
      if (action.flow_cta) parameter.flow_cta = action.flow_cta;
      if (action.flow_action) parameter.flow_action = action.flow_action;
      if (action.flow_action_data) parameter.flow_action_data = action.flow_action_data;
      if (action.flow_action_payload) parameter.flow_action_payload = action.flow_action_payload;
      if (action.flow_message_version) parameter.flow_message_version = action.flow_message_version;
      if (action.flow_token_label) parameter.flow_token_label = action.flow_token_label;
      if (action.flow_redirect_url) parameter.flow_redirect_url = action.flow_redirect_url;
      if (action.navigate_screen && !parameter.flow_action_data) {
        parameter.flow_action_data = { screen: action.navigate_screen };
      }
      if (action.flowId) parameter.flow_id = action.flowId;
      if (action.flowAction) parameter.flow_action = String(action.flowAction).toLowerCase();
      if (action.flowCta) parameter.flow_cta = action.flowCta;
      if (action.flowActionPayload && !parameter.flow_action_payload) {
        parameter.flow_action_payload = action.flowActionPayload;
      }
      if (action.flowActionData && !parameter.flow_action_data) {
        parameter.flow_action_data = action.flowActionData;
      }
      if (action.text && !parameter.flow_cta) {
        parameter.flow_cta = action.text;
      }
    }
  }

  if (!parameter.flow_cta && defaults && typeof defaults.text === 'string') {
    parameter.flow_cta = defaults.text;
  }

  return parameter;
}

async function fetchTemplateDefaults(baseUrl, templateName) {
  try {
    const res = await lazyFetch(`${baseUrl}/api/whatsapp/templates`);
    if (!res.ok) {
      throw new Error(`Failed to fetch templates: ${res.status} ${res.statusText}`);
    }
    const payload = await res.json();
    const list = Array.isArray(payload?.templates) ? payload.templates : [];
    const match = list.find((tpl) => tpl?.name === templateName);
    if (!match) {
      return [];
    }
    const defaults = Array.isArray(match.flowDefaults) ? match.flowDefaults : [];
    const fromButtons = Array.isArray(match?.whatsapp?.buttons)
      ? match.whatsapp.buttons
          .filter((btn) => btn?.type === 'FLOW')
          .map((btn) => ({ index: btn.index ?? 0, text: btn.text, action: btn }))
      : [];
    return [...defaults, ...fromButtons];
  } catch (error) {
    console.warn('[send-template-via-api] Unable to fetch template defaults', error);
    return [];
  }
}

async function fetchDefaultsFromDatabase(templateName) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const record = await prisma.whatsAppTemplate.findUnique({ where: { name: templateName } });
      if (!record) {
        return [];
      }
      const buttons = [];
      const components = Array.isArray(record.components) ? record.components : [];
      components.forEach((component) => {
        if (!component || component.type !== 'BUTTONS' || !Array.isArray(component.buttons)) {
          return;
        }
        component.buttons.forEach((btn, idx) => {
          if (!btn || (btn.type || '').toUpperCase() !== 'FLOW') {
            return;
          }
          const index = typeof btn.index === 'number' ? btn.index : idx;
          buttons.push({ index, text: btn.text, action: btn });
        });
      });
      return buttons;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.warn('[send-template-via-api] Unable to load defaults from database', error);
    return [];
  }
}

async function sendTemplate(options) {
  const {
    baseUrl,
    to,
    templateName,
    languageCode,
    variables,
    metadata,
    retry,
  } = options;

  const payload = {
    to,
    templateName,
    languageCode,
    variables,
    saveToDb: true,
    metadata,
  };

  const res = await lazyFetch(`${baseUrl}/api/whatsapp/send-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`Send failed with status ${res.status}`);
    error.responseBody = text;
    throw error;
  }

  const body = await res.json();
  if (!body?.success && retry > 0) {
    await sleep(750);
    return sendTemplate({ ...options, retry: retry - 1 });
  }
  return body;
}

async function main() {
  const [, , tplArg, phoneArg, varsFileArg] = process.argv;
  const templateName = tplArg || process.env.WHATSAPP_TEMPLATE || 'find_interestt';
  const to = toE164(phoneArg || process.env.RECIPIENT_PHONE || '+919978783238');
  const baseUrl = process.env.WHATSAPP_API_BASE || 'http://localhost:3000';
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  let variables = loadVariablesFromFile(varsFileArg) || {};

  if (!Object.keys(variables).some((key) => key.startsWith('_flow_button_'))) {
    let defaults = await fetchTemplateDefaults(baseUrl, templateName);
    if (!defaults.length) {
      defaults = await fetchDefaultsFromDatabase(templateName);
    }
    defaults
      .filter(Boolean)
      .forEach((entry, position) => {
        const idx = typeof entry.index === 'number' ? entry.index : position;
        const key = `_flow_button_${idx}`;
        if (!variables[key]) {
          const parameter = buildFlowButtonParameter(idx, entry);
          variables[key] = parameter;
        }
      });
    console.log('   Flow defaults resolved:', JSON.stringify(defaults, null, 2));
  }

  console.log('🚀 Sending template via API');
  console.log('   Template:', templateName);
  console.log('   To:', to);
  console.log('   Base URL:', baseUrl);
  if (Object.keys(variables).length) {
    console.log('   Variables:', JSON.stringify(variables, null, 2));
  }

  try {
    const result = await sendTemplate({
      baseUrl,
      to,
      templateName,
      languageCode,
      variables,
      metadata: { sentFrom: 'script', script: 'send-template-via-api' },
      retry: 0,
    });

    console.log('✅ Template sent successfully');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Failed to send template');
    console.error(error.message);
    if (error.responseBody) {
      console.error(error.responseBody);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
