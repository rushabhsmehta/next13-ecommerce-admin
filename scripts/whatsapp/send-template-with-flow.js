require('dotenv').config();

const https = require('https');

const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || 'EAAVramqNmOUBPmXA9DAvQUgwcRlmZBdZCWQDEr3547bEUDnPlz3VVGbkPJKrIMkk4wjgoB9Qk9HDZCJCRAW7sle6gfZCZCL8yvVKw2ssshqgqvwixmOrwdDdRWsip52JO8IzmwtXIZAvLN8KUsQphmypNcvzZCJFTKpSguM29JUCEnKjnmLLsxuXlgPVxPfe9zC3wZDZD';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '769802949556238';
const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '1163477029017210';
const RECIPIENT_PHONE = process.env.RECIPIENT_PHONE || '919978783238';
const DEFAULT_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
const DEFAULT_HEADER_IMAGE_URL = process.env.WHATSAPP_TEMPLATE_HEADER_IMAGE_URL || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1024&q=80';

const normalizePhoneNumber = (input) => {
    if (!input) {
        return input;
    }
    const trimmed = String(input).trim();
    if (trimmed.startsWith('+')) {
        return trimmed;
    }
    const digits = trimmed.replace(/[^\d]/g, '');
    return digits ? `+${digits}` : trimmed;
};

const requestJson = ({ path, method = 'GET', body }) => {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : undefined;
        const headers = {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        };
        if (payload) {
            headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path,
            method,
            headers,
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                let parsed;
                try {
                    parsed = data ? JSON.parse(data) : {};
                } catch (parseError) {
                    const err = new Error('Failed to parse response JSON');
                    err.statusCode = res.statusCode;
                    err.rawBody = data;
                    reject(err);
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(parsed);
                    return;
                }

                const err = new Error(parsed?.error?.message || `HTTP ${res.statusCode}`);
                err.statusCode = res.statusCode;
                err.body = parsed;
                reject(err);
            });
        });

        req.on('error', reject);

        if (payload) {
            req.write(payload);
        }

        req.end();
    });
};

const resolveTemplateMetadata = async (templateName) => {
    if (!BUSINESS_ACCOUNT_ID) {
        return null;
    }

    try {
        const response = await requestJson({
            path: `/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates?fields=name,language,status,components&limit=100`,
        });

        const templates = Array.isArray(response?.data) ? response.data : [];
        const match = templates.find((tpl) => tpl?.name === templateName);
        if (match) {
            return match;
        }
    } catch (error) {
        const message = error?.message || error;
        console.warn('⚠️  Unable to resolve template metadata automatically:', message);
    }

    return null;
};

const buildHeaderComponentFromMetadata = (metadata) => {
    const components = Array.isArray(metadata?.components) ? metadata.components : [];
    const headerMeta = components.find((component) => {
        const type = (component?.type || component?.TYPE || '').toString().toUpperCase();
        return type === 'HEADER';
    });

    if (!headerMeta) {
        return null;
    }

    const formatRaw = (headerMeta.format || headerMeta.format_type || headerMeta.header_format || '').toString().toUpperCase();

    if (formatRaw === 'IMAGE') {
        if (!DEFAULT_HEADER_IMAGE_URL) {
            console.warn('⚠️  Header requires an image but no URL is configured. Set WHATSAPP_TEMPLATE_HEADER_IMAGE_URL.');
            return null;
        }
        return {
            type: 'HEADER',
            parameters: [
                {
                    type: 'image',
                    image: { link: DEFAULT_HEADER_IMAGE_URL },
                },
            ],
        };
    }

    if (formatRaw === 'VIDEO') {
        console.warn('⚠️  Header requires a video. Provide WHATSAPP_TEMPLATE_HEADER_VIDEO_URL to enable this send path.');
        return null;
    }

    if (formatRaw === 'DOCUMENT') {
        console.warn('⚠️  Header requires a document. Provide WHATSAPP_TEMPLATE_HEADER_DOCUMENT_URL to enable this send path.');
        return null;
    }

    return null;
};

const buildTemplatePayload = ({
    recipient,
    templateName,
    language = DEFAULT_TEMPLATE_LANGUAGE,
    flowToken,
    flowActionData,
    header,
}) => {
    const actionPayload = {
        flow_token: flowToken || `flow_token_${Date.now()}`,
    };

    if (flowActionData && Object.keys(flowActionData).length > 0) {
        actionPayload.flow_action_data = flowActionData;
    }

    const components = [];

    if (header && Array.isArray(header.parameters) && header.parameters.length) {
        components.push(header);
    }

    components.push({
        type: 'BUTTON',
        sub_type: 'FLOW',
        index: 0,
        parameters: [
            {
                type: 'ACTION',
                action: actionPayload,
            },
        ],
    });

    const template = {
        name: templateName,
        language: {
            code: language,
        },
    };

    if (components.length) {
        template.components = components;
    }

    return {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template,
    };
};

async function sendTemplate({ templateName, recipient }) {
    const resolvedTemplateName = templateName || 'find_interestt';
    const resolvedRecipient = normalizePhoneNumber(recipient || RECIPIENT_PHONE);
    if (!resolvedRecipient) {
        throw new Error('Recipient phone number is required.');
    }

    const templateMetadata = await resolveTemplateMetadata(resolvedTemplateName);
    const language = templateMetadata?.language || DEFAULT_TEMPLATE_LANGUAGE;
    const headerComponent = buildHeaderComponentFromMetadata(templateMetadata);
    const payload = buildTemplatePayload({
        recipient: resolvedRecipient,
        templateName: resolvedTemplateName,
        language,
        header: headerComponent,
    });

    console.log('🚀 Sending WhatsApp template message...');
    console.log('📱 To:', payload.to);
    console.log('📝 Template:', payload.template.name);
    console.log('🗣 Language:', payload.template.language.code);
    if (headerComponent) {
        console.log('🖼 Header component attached.');
    }
    const flowComponent = Array.isArray(payload.template.components)
        ? payload.template.components.find((component) => component?.type === 'BUTTON')
        : undefined;
    const flowParam = flowComponent?.parameters?.[0];
    console.log('🔧 Flow Token:', flowParam?.action?.flow_token || '(missing)');
    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await requestJson({
            path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
            method: 'POST',
            body: payload,
        });

        if (response?.messages && response.messages[0]) {
            console.log('\n✅ Template sent successfully!');
            console.log('✅ Message ID:', response.messages[0].id);
            if (response.messages[0].wamid) {
                console.log('📱 WhatsApp ID:', response.messages[0].wamid);
            }
            return;
        }

        console.log('\n❌ Unexpected response while sending template:');
        console.log('📊 Response:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.log('\n❌ Error sending template:');
        if (error?.body) {
            console.log('📊 Response:', JSON.stringify(error.body, null, 2));
        } else {
            console.error(error);
        }
    }
}

const [, , templateArg, recipientArg] = process.argv;

sendTemplate({
    templateName: templateArg || process.env.WHATSAPP_TEMPLATE_NAME,
    recipient: recipientArg || process.env.RECIPIENT_PHONE,
}).catch((error) => {
    console.error('❌ Failed to send template:', error.message || error);
    process.exitCode = 1;
});