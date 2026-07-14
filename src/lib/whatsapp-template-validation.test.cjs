const assert = require('node:assert/strict');
const test = require('node:test');

require('ts-node/register/transpile-only');

const {
  buildMetaTemplatePayload,
  validateWhatsAppTemplateDraft,
} = require('./whatsapp-template-validation.ts');

function baseDraft(overrides = {}) {
  return {
    name: 'booking_status_update',
    language: 'en_US',
    category: 'UTILITY',
    parameterFormat: 'named',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{customer_name}}, your booking {{booking_id}} is confirmed.',
      },
    ],
    examples: {
      body: {
        customer_name: 'Riya',
        booking_id: 'BK-1024',
      },
    },
    ...overrides,
  };
}

test('valid utility named-parameter template builds Meta payload examples', () => {
  const draft = baseDraft({
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Booking {{booking_id}}' },
      {
        type: 'BODY',
        text: 'Hi {{customer_name}}, your booking {{booking_id}} is confirmed.',
      },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Thanks' }] },
    ],
    examples: {
      header: { booking_id: 'BK-1024' },
      body: { customer_name: 'Riya', booking_id: 'BK-1024' },
    },
  });

  const validation = validateWhatsAppTemplateDraft(draft);
  assert.equal(validation.success, true);
  assert.equal(validation.payload.parameter_format, 'NAMED');
  assert.deepEqual(validation.payload.components[0].example.header_text_named_params, [
    { param_name: 'booking_id', example: 'BK-1024' },
  ]);
  assert.deepEqual(validation.payload.components[1].example.body_text_named_params, [
    { param_name: 'customer_name', example: 'Riya' },
    { param_name: 'booking_id', example: 'BK-1024' },
  ]);
});

test('valid media-header template requires a Meta handle', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'HEADER', format: 'IMAGE', mediaHandle: '4::meta-template-handle' },
      { type: 'BODY', text: 'Your itinerary is ready.' },
    ],
    examples: {},
  }));

  assert.equal(validation.success, true);
  assert.deepEqual(validation.payload.components[0].example, {
    header_handle: ['4::meta-template-handle'],
  });
});

test('valid marketing copy-code template is accepted', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    name: 'seasonal_offer_code',
    category: 'MARKETING',
    components: [
      { type: 'BODY', text: 'Use this travel offer before it expires.' },
      { type: 'BUTTONS', buttons: [{ type: 'COPY_CODE', example: 'SAVE250' }] },
    ],
    examples: {},
  }));

  assert.equal(validation.success, true);
  assert.deepEqual(validation.payload.components[1].buttons[0], {
    type: 'COPY_CODE',
    example: 'SAVE250',
  });
});

test('valid authentication copy-code template builds OTP components', () => {
  const payload = buildMetaTemplatePayload({
    name: 'login_verification_code',
    language: 'en_US',
    category: 'AUTHENTICATION',
    components: [{ type: 'BODY', text: '' }],
    auth: {
      addSecurityRecommendation: true,
      codeExpirationMinutes: 10,
      copyCodeButtonText: 'Copy code',
    },
  });

  assert.equal(payload.category, 'AUTHENTICATION');
  assert.equal(payload.components[2].buttons[0].type, 'OTP');
  assert.equal(payload.components[2].buttons[0].otp_type, 'COPY_CODE');
});

test('invalid template without body is rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [{ type: 'HEADER', format: 'TEXT', text: 'Hello' }],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /body component is required/i);
});

test('invalid long body is rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [{ type: 'BODY', text: 'a'.repeat(1025) }],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /1024/);
});

test('invalid long header is rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'h'.repeat(61) },
      { type: 'BODY', text: 'Your booking update is ready.' },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /Header text must be 60/);
});

test('invalid long footer is rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'BODY', text: 'Your booking update is ready.' },
      { type: 'FOOTER', text: 'f'.repeat(61) },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /Footer text must be 60/);
});

test('missing variable examples are rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [{ type: 'BODY', text: 'Hi {{customer_name}}.' }],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /Example value required/);
});

test('non-sequential positional variables are rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    parameterFormat: 'positional',
    components: [{ type: 'BODY', text: 'Hi {{1}}, booking {{3}} is ready.' }],
    examples: { body: { 1: 'Riya', 3: 'BK-1024' } },
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /sequential/);
});

test('media headers reject public URLs as handles', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'HEADER', format: 'DOCUMENT', mediaHandle: 'https://example.com/file.pdf' },
      { type: 'BODY', text: 'Please review the attached itinerary.' },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /not a public URL/);
});

test('URL button variables require examples', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'BODY', text: 'Open your booking details.' },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'URL', text: 'View', url: 'https://example.com/bookings/{{booking_id}}' }],
      },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /Example value required/);
});

test('unsupported advanced component types are rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'BODY', text: 'Hello.' },
      { type: 'CAROUSEL', cards: [] },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
});

test('bad button combinations are rejected', () => {
  const validation = validateWhatsAppTemplateDraft(baseDraft({
    components: [
      { type: 'BODY', text: 'Choose an action.' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'One', url: 'https://example.com/one' },
          { type: 'PHONE_NUMBER', text: 'Call', phone_number: '+919876543210' },
          { type: 'FLOW', text: 'Flow', flow_id: '12345' },
        ],
      },
    ],
    examples: {},
  }));

  assert.equal(validation.success, false);
  assert.match(validation.issues.map((issue) => issue.message).join('\n'), /CTA/);
});
