require('dotenv').config();
const { PrismaClient } = require('@prisma/whatsapp-client');

const fetchFn = typeof fetch === 'function'
  ? fetch
  : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const prisma = new PrismaClient();

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const MESSAGE_TYPE = (process.env.CAMPAIGN_MESSAGE_TYPE || 'template').toLowerCase();
const TEXT_MESSAGE = process.env.CAMPAIGN_TEXT_MESSAGE || 'hello world';
const TEXT_PREVIEW_URL = (process.env.CAMPAIGN_TEXT_PREVIEW_URL || 'false').toLowerCase() === 'true';
const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const TEMPLATE_LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const HEADER_MEDIA_ID = process.env.MEDIA_ID || '';
const HEADER_IMAGE = process.env.HEADER_IMAGE || '';
const FLOW_BUTTON_ENABLED = (process.env.CAMPAIGN_FLOW_BUTTON_ENABLED || 'true').toLowerCase() !== 'false';
const FLOW_BUTTON_INDEX = Number.isNaN(Number(process.env.CAMPAIGN_FLOW_BUTTON_INDEX))
  ? 2
  : Number(process.env.CAMPAIGN_FLOW_BUTTON_INDEX);
const FLOW_TOKEN_PREFIX = process.env.CAMPAIGN_FLOW_TOKEN_PREFIX || 'unique_flow_token_';
const FLOW_STATIC_TOKEN = process.env.CAMPAIGN_FLOW_TOKEN || '';
const FLOW_ACTION_DATA_RAW = process.env.CAMPAIGN_FLOW_ACTION_DATA || '';

function parseFlowActionData(raw) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse CAMPAIGN_FLOW_ACTION_DATA as JSON. Ignoring value.');
    return undefined;
  }
}
const RECIPIENT_NUMBER = process.env.CAMPAIGN_RECIPIENT || '+919978783238';
const CAMPAIGN_NAME = process.env.CAMPAIGN_NAME || `Single Recipient Campaign ${new Date().toISOString()}`;

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error('Missing META_WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_PHONE_NUMBER_ID environment variables.');
  process.exit(1);
}

function buildComponents() {
  if (MESSAGE_TYPE !== 'template') {
    return undefined;
  }

  const components = [];

  if (HEADER_MEDIA_ID) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: { id: HEADER_MEDIA_ID }
        }
      ]
    });
  } else if (HEADER_IMAGE) {
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: { link: HEADER_IMAGE }
        }
      ]
    });
  }

  if (FLOW_BUTTON_ENABLED) {
    const actionData = {
      flow_token: FLOW_STATIC_TOKEN || `${FLOW_TOKEN_PREFIX}${Date.now()}`
    };

    const parsedFlowActionData = parseFlowActionData(FLOW_ACTION_DATA_RAW);
    if (parsedFlowActionData) {
      actionData.flow_action_data = parsedFlowActionData;
    }

    components.push({
      type: 'button',
      sub_type: 'FLOW',
      index: Number.isFinite(FLOW_BUTTON_INDEX) ? FLOW_BUTTON_INDEX : 2,
      parameters: [
        {
          type: 'ACTION',
          action: actionData
        }
      ]
    });
  }

  return components.length > 0 ? components : undefined;
}

function buildMessagePayload(to) {
  if (MESSAGE_TYPE === 'text') {
    return {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        preview_url: TEXT_PREVIEW_URL,
        body: TEXT_MESSAGE
      }
    };
  }

  const components = buildComponents();
  const template = {
    name: TEMPLATE_NAME,
    language: { code: TEMPLATE_LANGUAGE }
  };

  if (components) {
    template.components = components;
  }

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template
  };
}

async function sendWhatsAppMessage(to) {
  const payload = buildMessagePayload(to);
  console.log('Meta payload:', JSON.stringify(payload, null, 2));

  const response = await fetchFn(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    console.error('Failed to parse response JSON:', err);
  }

  return { status: response.status, ok: response.ok, data };
}

async function main() {
  console.log('Creating WhatsApp campaign for single recipient...');

  const effectiveTemplateName = MESSAGE_TYPE === 'text' ? 'text_message' : TEMPLATE_NAME;
  const campaign = await prisma.whatsAppCampaign.create({
    data: {
      name: CAMPAIGN_NAME,
      description: 'Auto-created via create-single-recipient-campaign script',
      templateName: effectiveTemplateName,
      templateLanguage: TEMPLATE_LANGUAGE,
      templateVariables: MESSAGE_TYPE === 'text' ? { body: TEXT_MESSAGE } : {},
      targetType: 'manual',
      status: 'draft',
      rateLimit: 10,
      totalRecipients: 1,
      createdBy: null
    }
  });

  const recipient = await prisma.whatsAppCampaignRecipient.create({
    data: {
      campaignId: campaign.id,
      phoneNumber: RECIPIENT_NUMBER,
      name: 'Campaign Recipient',
      variables: {}
    }
  });

  console.log('Campaign created:', campaign.id);
  console.log('Recipient added:', recipient.phoneNumber);

  await prisma.whatsAppCampaign.update({
    where: { id: campaign.id },
    data: {
      status: 'sending',
      startedAt: new Date()
    }
  });

  console.log(`Sending ${MESSAGE_TYPE} message through Meta API...`);
  const result = await sendWhatsAppMessage(RECIPIENT_NUMBER);

  if (result.ok && result.data && !result.data.error) {
    const messageId = result.data?.messages?.[0]?.id || null;

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        messageId
      }
    });

    await prisma.whatsAppCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'completed',
        sentCount: 1,
        completedAt: new Date()
      }
    });

    console.log('Message sent successfully:', messageId);
  } else {
    const errorPayload = result.data && result.data.error ? result.data.error : result.data;
    const errorCode = errorPayload && errorPayload.code ? String(errorPayload.code) : null;

    await prisma.whatsAppCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorCode,
        errorMessage: errorPayload ? JSON.stringify(errorPayload) : 'Unknown error'
      }
    });

    await prisma.whatsAppCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'failed',
        failedCount: 1,
        completedAt: new Date()
      }
    });

    console.error('Failed to send message. Response:', JSON.stringify(result.data, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Script error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
