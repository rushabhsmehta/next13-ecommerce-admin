import { z } from 'zod';

export const WHATSAPP_TEMPLATE_LIMITS = {
  name: 512,
  headerText: 60,
  bodyText: 1024,
  footerText: 60,
  buttonText: 25,
  totalButtons: 10,
  ctaButtons: 2,
  quickReplyButtons: 10,
  urlButtons: 2,
  phoneButtons: 1,
  flowButtons: 1,
  copyCodeButtons: 1,
  textHeaderVariables: 1,
  authCodeExpirationMin: 1,
  authCodeExpirationMax: 90,
} as const;

export const TEMPLATE_PARAMETER_FORMATS = ['named', 'positional'] as const;
export const TEMPLATE_CATEGORIES = ['AUTHENTICATION', 'MARKETING', 'UTILITY'] as const;
export const TEMPLATE_HEADER_FORMATS = ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'] as const;
export const TEMPLATE_BUTTON_TYPES = ['QUICK_REPLY', 'PHONE_NUMBER', 'URL', 'FLOW', 'COPY_CODE'] as const;

const PUBLIC_MEDIA_REFERENCE_PATTERN = /^(https?:\/\/|\/\/|data:)/i;
const PUBLIC_MEDIA_FILENAME_PATTERN = /\.(?:jpe?g|png|mp4|pdf)(?:[?#].*)?$/i;

export type TemplateParameterFormat = (typeof TEMPLATE_PARAMETER_FORMATS)[number];
export type MetaTemplateParameterFormat = 'NAMED' | 'POSITIONAL';
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export type TemplateHeaderFormat = (typeof TEMPLATE_HEADER_FORMATS)[number];
export type TemplateButtonType = (typeof TEMPLATE_BUTTON_TYPES)[number];

export type TemplateValidationIssueLevel = 'error' | 'warning';

export type TemplateValidationIssue = {
  level: TemplateValidationIssueLevel;
  path: Array<string | number>;
  message: string;
};

export type TemplateExamples = {
  header?: Record<string, string>;
  body?: Record<string, string>;
  buttons?: Record<string, Record<string, string>>;
};

export type TemplateButtonDraft = {
  type: TemplateButtonType;
  text?: string;
  url?: string;
  phone_number?: string;
  flow_id?: string;
  example?: string;
};

export type TemplateComponentDraft =
  | {
      type: 'HEADER';
      format: TemplateHeaderFormat;
      text?: string;
      mediaHandle?: string;
      mediaUrl?: string;
      fileName?: string;
      example?: unknown;
    }
  | {
      type: 'BODY';
      text?: string;
      example?: unknown;
    }
  | {
      type: 'FOOTER';
      text?: string;
    }
  | {
      type: 'BUTTONS';
      buttons?: TemplateButtonDraft[];
    };

export type TemplateAuthOptions = {
  addSecurityRecommendation?: boolean;
  codeExpirationMinutes?: number;
  copyCodeButtonText?: string;
};

export type TemplateDraft = {
  name: string;
  language: string;
  category: TemplateCategory;
  parameterFormat?: TemplateParameterFormat;
  parameter_format?: TemplateParameterFormat;
  allowCategoryChange?: boolean;
  allow_category_change?: boolean;
  components: TemplateComponentDraft[];
  examples?: TemplateExamples;
  auth?: TemplateAuthOptions;
};

export type MetaTemplatePayload = {
  name: string;
  language: string;
  category: TemplateCategory;
  parameter_format?: MetaTemplateParameterFormat;
  allow_category_change?: boolean;
  components: Array<Record<string, unknown>>;
};

const VariableSchema = z.record(z.string().default(''));

export const TemplateButtonDraftSchema = z
  .object({
    type: z.enum(TEMPLATE_BUTTON_TYPES),
    text: z.string().optional(),
    url: z.string().optional(),
    phone_number: z.string().optional(),
    flow_id: z.string().optional(),
    example: z.string().optional(),
  })
  .passthrough();

export const TemplateComponentDraftSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('HEADER'),
      format: z.enum(TEMPLATE_HEADER_FORMATS),
      text: z.string().optional(),
      mediaHandle: z.string().optional(),
      mediaUrl: z.string().optional(),
      fileName: z.string().optional(),
      example: z.unknown().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('BODY'),
      text: z.string().optional(),
      example: z.unknown().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('FOOTER'),
      text: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal('BUTTONS'),
      buttons: z.array(TemplateButtonDraftSchema).optional(),
    })
    .passthrough(),
]);

export const TemplateDraftSchema = z
  .object({
    name: z.string().trim().min(1, 'Template name is required').max(WHATSAPP_TEMPLATE_LIMITS.name),
    language: z.string().trim().min(1, 'Language is required'),
    category: z.enum(TEMPLATE_CATEGORIES),
    parameterFormat: z.enum(TEMPLATE_PARAMETER_FORMATS).optional(),
    parameter_format: z.enum(TEMPLATE_PARAMETER_FORMATS).optional(),
    allowCategoryChange: z.boolean().optional(),
    allow_category_change: z.boolean().optional(),
    components: z.array(TemplateComponentDraftSchema).min(1, 'At least one component is required'),
    examples: z
      .object({
        header: VariableSchema.optional(),
        body: VariableSchema.optional(),
        buttons: z.record(VariableSchema).optional(),
      })
      .optional(),
    auth: z
      .object({
        addSecurityRecommendation: z.boolean().optional(),
        codeExpirationMinutes: z.number().int().optional(),
        copyCodeButtonText: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export function extractTemplateVariables(text: string | undefined): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    found.add(match[1]);
  }
  return Array.from(found);
}

export function isLikelyPublicMediaReference(value?: string | null) {
  const candidate = value?.trim();
  if (!candidate) return false;
  return PUBLIC_MEDIA_REFERENCE_PATTERN.test(candidate) || PUBLIC_MEDIA_FILENAME_PATTERN.test(candidate);
}

export function normalizeTemplateDraft(input: unknown): TemplateDraft {
  const parsed = TemplateDraftSchema.parse(input);
  return {
    ...parsed,
    name: parsed.name.trim(),
    language: parsed.language.trim(),
    parameterFormat: parsed.parameterFormat ?? parsed.parameter_format ?? 'named',
    allowCategoryChange: parsed.allowCategoryChange ?? parsed.allow_category_change,
    components: parsed.components.map((component) => {
      if (component.type === 'HEADER') {
        return {
          ...component,
          text: component.text ?? '',
          mediaHandle: component.mediaHandle ?? extractHeaderHandle(component.example),
        };
      }
      if (component.type === 'BODY' || component.type === 'FOOTER') {
        return { ...component, text: component.text ?? '' };
      }
      return {
        ...component,
        buttons: (component.buttons ?? []).map((button) => ({
          ...button,
          text: button.text ?? '',
        })),
      };
    }),
  };
}

export function validateWhatsAppTemplateDraft(input: unknown): {
  success: boolean;
  draft?: TemplateDraft;
  payload?: MetaTemplatePayload;
  issues: TemplateValidationIssue[];
  readinessScore: number;
} {
  const parsed = TemplateDraftSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      level: 'error' as const,
      path: issue.path,
      message: issue.message,
    }));
    return { success: false, issues, readinessScore: 0 };
  }

  const draft = normalizeTemplateDraft(parsed.data);
  const issues = collectTemplateIssues(draft);
  const errors = issues.filter((issue) => issue.level === 'error');
  const readinessScore = calculateReadinessScore(issues);

  if (errors.length) {
    return { success: false, draft, issues, readinessScore };
  }

  return {
    success: true,
    draft,
    payload: buildMetaTemplatePayload(draft),
    issues,
    readinessScore,
  };
}

export function buildMetaTemplatePayload(input: TemplateDraft): MetaTemplatePayload {
  const draft = normalizeTemplateDraft(input);
  const parameterFormat = draft.parameterFormat ?? 'named';
  const metaParameterFormat = parameterFormat === 'named' ? 'NAMED' : 'POSITIONAL';

  if (draft.category === 'AUTHENTICATION') {
    const expiration = clampAuthExpiration(draft.auth?.codeExpirationMinutes);
    return {
      name: draft.name,
      language: draft.language,
      category: draft.category,
      components: [
        {
          type: 'BODY',
          add_security_recommendation: draft.auth?.addSecurityRecommendation ?? true,
        },
        {
          type: 'FOOTER',
          code_expiration_minutes: expiration,
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'OTP',
              otp_type: 'COPY_CODE',
              text: trimOrDefault(draft.auth?.copyCodeButtonText, 'Copy code'),
            },
          ],
        },
      ],
    };
  }

  const components: Array<Record<string, unknown>> = [];

  for (const component of orderComponents(draft.components)) {
    if (component.type === 'HEADER') {
      if (component.format === 'TEXT') {
        const metaHeader: Record<string, unknown> = {
          type: 'HEADER',
          format: 'TEXT',
          text: component.text?.trim() ?? '',
        };
        const variables = extractTemplateVariables(component.text);
        if (variables.length) {
          metaHeader.example = buildTextExample('header', variables, parameterFormat, draft, component.example);
        }
        components.push(metaHeader);
      } else if (component.format === 'LOCATION') {
        components.push({ type: 'HEADER', format: 'LOCATION' });
      } else {
        components.push({
          type: 'HEADER',
          format: component.format,
          example: {
            header_handle: [component.mediaHandle?.trim() || extractHeaderHandle(component.example)],
          },
        });
      }
    }

    if (component.type === 'BODY') {
      const metaBody: Record<string, unknown> = {
        type: 'BODY',
        text: component.text?.trim() ?? '',
      };
      const variables = extractTemplateVariables(component.text);
      if (variables.length) {
        metaBody.example = buildTextExample('body', variables, parameterFormat, draft, component.example);
      }
      components.push(metaBody);
    }

    if (component.type === 'FOOTER' && component.text?.trim()) {
      components.push({
        type: 'FOOTER',
        text: component.text.trim(),
      });
    }

    if (component.type === 'BUTTONS' && component.buttons?.length) {
      components.push({
        type: 'BUTTONS',
        buttons: component.buttons.map((button, index) => buildMetaButton(button, index, draft)),
      });
    }
  }

  return {
    name: draft.name,
    language: draft.language,
    category: draft.category,
    parameter_format: metaParameterFormat,
    ...(typeof draft.allowCategoryChange === 'boolean'
      ? { allow_category_change: draft.allowCategoryChange }
      : {}),
    components,
  };
}

export function collectTemplateIssues(draft: TemplateDraft): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  const parameterFormat = draft.parameterFormat ?? 'named';

  if (!/^[a-z0-9_]+$/.test(draft.name)) {
    pushIssue(issues, ['name'], 'Template name must use lowercase letters, numbers, and underscores only.');
  }

  if (draft.category === 'AUTHENTICATION') {
    const expiration = draft.auth?.codeExpirationMinutes ?? 10;
    if (
      expiration < WHATSAPP_TEMPLATE_LIMITS.authCodeExpirationMin ||
      expiration > WHATSAPP_TEMPLATE_LIMITS.authCodeExpirationMax
    ) {
      pushIssue(issues, ['auth', 'codeExpirationMinutes'], 'Authentication code expiration must be between 1 and 90 minutes.');
    }
    if ((draft.auth?.copyCodeButtonText ?? 'Copy code').trim().length > WHATSAPP_TEMPLATE_LIMITS.buttonText) {
      pushIssue(issues, ['auth', 'copyCodeButtonText'], `OTP button text must be ${WHATSAPP_TEMPLATE_LIMITS.buttonText} characters or fewer.`);
    }
    return issues;
  }

  const headerComponents = draft.components.filter((component) => component.type === 'HEADER');
  const bodyComponents = draft.components.filter((component) => component.type === 'BODY');
  const footerComponents = draft.components.filter((component) => component.type === 'FOOTER');
  const buttonComponents = draft.components.filter((component) => component.type === 'BUTTONS');

  if (headerComponents.length > 1) {
    pushIssue(issues, ['components'], 'Only one header component can be submitted.');
  }

  if (bodyComponents.length !== 1) {
    pushIssue(issues, ['components'], 'Exactly one body component is required.');
  }

  if (footerComponents.length > 1) {
    pushIssue(issues, ['components'], 'Only one footer component can be submitted.');
  }

  if (buttonComponents.length > 1) {
    pushIssue(issues, ['components'], 'Only one button component can be submitted.');
  }

  draft.components.forEach((component, componentIndex) => {
    if (component.type === 'HEADER') {
      validateHeader(component, componentIndex, draft, parameterFormat, issues);
    }
    if (component.type === 'BODY') {
      validateBody(component, componentIndex, draft, parameterFormat, issues);
    }
    if (component.type === 'FOOTER') {
      validateFooter(component, componentIndex, issues);
    }
    if (component.type === 'BUTTONS') {
      validateButtons(component, componentIndex, draft, parameterFormat, issues);
    }
  });

  if (draft.category === 'MARKETING') {
    pushIssue(
      issues,
      ['category'],
      'Marketing templates require customer opt-in and may be affected by Meta per-user marketing limits.',
      'warning'
    );
  }

  return issues;
}

function validateHeader(
  component: Extract<TemplateComponentDraft, { type: 'HEADER' }>,
  componentIndex: number,
  draft: TemplateDraft,
  parameterFormat: TemplateParameterFormat,
  issues: TemplateValidationIssue[]
) {
  if (component.format === 'TEXT') {
    const text = component.text?.trim() ?? '';
    if (!text) {
      pushIssue(issues, ['components', componentIndex, 'text'], 'Text header cannot be empty.');
    }
    if (text.length > WHATSAPP_TEMPLATE_LIMITS.headerText) {
      pushIssue(issues, ['components', componentIndex, 'text'], `Header text must be ${WHATSAPP_TEMPLATE_LIMITS.headerText} characters or fewer.`);
    }
    const variables = extractTemplateVariables(text);
    if (variables.length > WHATSAPP_TEMPLATE_LIMITS.textHeaderVariables) {
      pushIssue(issues, ['components', componentIndex, 'text'], 'Text headers can use only one variable.');
    }
    validateVariables('header', variables, parameterFormat, draft, component.example, ['components', componentIndex, 'text'], issues);
    return;
  }

  if (component.format === 'IMAGE' || component.format === 'VIDEO' || component.format === 'DOCUMENT') {
    const handle = component.mediaHandle?.trim() || extractHeaderHandle(component.example);
    if (!handle) {
      pushIssue(issues, ['components', componentIndex, 'mediaHandle'], `${component.format} headers require a Meta template media handle.`);
    }
    if (isLikelyPublicMediaReference(handle)) {
      pushIssue(
        issues,
        ['components', componentIndex, 'mediaHandle'],
        'Template media must use a Meta upload handle generated by the Upload button, not a public URL or file name.'
      );
    }
  }
}

function validateBody(
  component: Extract<TemplateComponentDraft, { type: 'BODY' }>,
  componentIndex: number,
  draft: TemplateDraft,
  parameterFormat: TemplateParameterFormat,
  issues: TemplateValidationIssue[]
) {
  const text = component.text?.trim() ?? '';
  if (!text) {
    pushIssue(issues, ['components', componentIndex, 'text'], 'Body text is required.');
  }
  if (text.length > WHATSAPP_TEMPLATE_LIMITS.bodyText) {
    pushIssue(issues, ['components', componentIndex, 'text'], `Body text must be ${WHATSAPP_TEMPLATE_LIMITS.bodyText} characters or fewer.`);
  }
  validateVariables('body', extractTemplateVariables(text), parameterFormat, draft, component.example, ['components', componentIndex, 'text'], issues);
}

function validateFooter(
  component: Extract<TemplateComponentDraft, { type: 'FOOTER' }>,
  componentIndex: number,
  issues: TemplateValidationIssue[]
) {
  const text = component.text?.trim() ?? '';
  if (text.length > WHATSAPP_TEMPLATE_LIMITS.footerText) {
    pushIssue(issues, ['components', componentIndex, 'text'], `Footer text must be ${WHATSAPP_TEMPLATE_LIMITS.footerText} characters or fewer.`);
  }
  if (extractTemplateVariables(text).length) {
    pushIssue(issues, ['components', componentIndex, 'text'], 'Footer text cannot contain variables.');
  }
}

function validateButtons(
  component: Extract<TemplateComponentDraft, { type: 'BUTTONS' }>,
  componentIndex: number,
  draft: TemplateDraft,
  parameterFormat: TemplateParameterFormat,
  issues: TemplateValidationIssue[]
) {
  const buttons = component.buttons ?? [];
  if (!buttons.length) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], 'Add at least one button or remove the buttons component.');
    return;
  }
  if (buttons.length > WHATSAPP_TEMPLATE_LIMITS.totalButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], `A template can have at most ${WHATSAPP_TEMPLATE_LIMITS.totalButtons} buttons.`);
  }

  const quickReplies = buttons.filter((button) => button.type === 'QUICK_REPLY').length;
  const urlButtons = buttons.filter((button) => button.type === 'URL').length;
  const phoneButtons = buttons.filter((button) => button.type === 'PHONE_NUMBER').length;
  const flowButtons = buttons.filter((button) => button.type === 'FLOW').length;
  const copyCodeButtons = buttons.filter((button) => button.type === 'COPY_CODE').length;
  const ctaButtons = urlButtons + phoneButtons + flowButtons;

  if (quickReplies > WHATSAPP_TEMPLATE_LIMITS.quickReplyButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], `Use at most ${WHATSAPP_TEMPLATE_LIMITS.quickReplyButtons} quick replies.`);
  }
  if (ctaButtons > WHATSAPP_TEMPLATE_LIMITS.ctaButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], `Use at most ${WHATSAPP_TEMPLATE_LIMITS.ctaButtons} CTA buttons.`);
  }
  if (urlButtons > WHATSAPP_TEMPLATE_LIMITS.urlButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], `Use at most ${WHATSAPP_TEMPLATE_LIMITS.urlButtons} URL buttons.`);
  }
  if (phoneButtons > WHATSAPP_TEMPLATE_LIMITS.phoneButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], 'Use at most one phone number button.');
  }
  if (flowButtons > WHATSAPP_TEMPLATE_LIMITS.flowButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], 'Use at most one Flow button.');
  }
  if (copyCodeButtons > WHATSAPP_TEMPLATE_LIMITS.copyCodeButtons) {
    pushIssue(issues, ['components', componentIndex, 'buttons'], 'Use at most one copy-code button.');
  }

  buttons.forEach((button, buttonIndex) => {
    validateButton(button, buttonIndex, componentIndex, draft, parameterFormat, issues);
  });
}

function validateButton(
  button: TemplateButtonDraft,
  buttonIndex: number,
  componentIndex: number,
  draft: TemplateDraft,
  parameterFormat: TemplateParameterFormat,
  issues: TemplateValidationIssue[]
) {
  const buttonPath = ['components', componentIndex, 'buttons', buttonIndex];

  if (button.type !== 'COPY_CODE') {
    const text = button.text?.trim() ?? '';
    if (!text) {
      pushIssue(issues, [...buttonPath, 'text'], 'Button text is required.');
    }
    if (text.length > WHATSAPP_TEMPLATE_LIMITS.buttonText) {
      pushIssue(issues, [...buttonPath, 'text'], `Button text must be ${WHATSAPP_TEMPLATE_LIMITS.buttonText} characters or fewer.`);
    }
  }

  if (button.type === 'URL') {
    const url = button.url?.trim() ?? '';
    if (!url) {
      pushIssue(issues, [...buttonPath, 'url'], 'URL buttons require a URL.');
    } else {
      try {
        new URL(url.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, 'example'));
      } catch {
        pushIssue(issues, [...buttonPath, 'url'], 'URL button must use a valid URL.');
      }
    }

    const variables = extractTemplateVariables(url);
    if (variables.length > 1) {
      pushIssue(issues, [...buttonPath, 'url'], 'URL buttons can use at most one variable.');
    }
    validateVariables(
      `button:${buttonIndex}`,
      variables,
      parameterFormat,
      draft,
      button.example ? { button_text: [button.example] } : undefined,
      [...buttonPath, 'url'],
      issues
    );
  }

  if (button.type === 'PHONE_NUMBER') {
    const phone = button.phone_number?.trim() ?? '';
    if (!phone) {
      pushIssue(issues, [...buttonPath, 'phone_number'], 'Phone buttons require a phone number.');
    } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      pushIssue(issues, [...buttonPath, 'phone_number'], 'Phone number must use E.164 format, for example +919876543210.');
    }
  }

  if (button.type === 'FLOW' && !button.flow_id?.trim()) {
    pushIssue(issues, [...buttonPath, 'flow_id'], 'Flow buttons require a published Flow ID.');
  }

  if (button.type === 'COPY_CODE') {
    if (draft.category !== 'MARKETING') {
      pushIssue(issues, buttonPath, 'Copy-code buttons are only supported for marketing templates.');
    }
    if (!button.example?.trim()) {
      pushIssue(issues, [...buttonPath, 'example'], 'Copy-code buttons require an example code.');
    }
  }
}

function validateVariables(
  source: 'header' | 'body' | `button:${number}`,
  variables: string[],
  parameterFormat: TemplateParameterFormat,
  draft: TemplateDraft,
  existingExample: unknown,
  path: Array<string | number>,
  issues: TemplateValidationIssue[]
) {
  if (!variables.length) return;

  if (parameterFormat === 'positional') {
    const numeric = variables.map((variable) => Number(variable));
    if (numeric.some((value) => !Number.isInteger(value) || value <= 0)) {
      pushIssue(issues, path, 'Positional templates must use variables like {{1}}, {{2}}, and {{3}}.');
      return;
    }
    const sorted = [...new Set(numeric)].sort((a, b) => a - b);
    sorted.forEach((value, index) => {
      if (value !== index + 1) {
        pushIssue(issues, path, 'Positional variables must be sequential starting from {{1}}.');
      }
    });
  } else {
    const invalid = variables.find((variable) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable));
    if (invalid) {
      pushIssue(issues, path, `Named parameter "${invalid}" must start with a letter and use only letters, numbers, and underscores.`);
      return;
    }
  }

  variables.forEach((variable) => {
    if (!getExampleValue(source, variable, draft, existingExample)) {
      pushIssue(issues, path, `Example value required for {{${variable}}}.`);
    }
  });
}

function buildTextExample(
  source: 'header' | 'body',
  variables: string[],
  parameterFormat: TemplateParameterFormat,
  draft: TemplateDraft,
  existingExample: unknown
) {
  if (parameterFormat === 'named') {
    const key = source === 'header' ? 'header_text_named_params' : 'body_text_named_params';
    return {
      [key]: variables.map((variable) => ({
        param_name: variable,
        example: getExampleValue(source, variable, draft, existingExample),
      })),
    };
  }

  if (source === 'header') {
    return {
      header_text: variables.map((variable) => getExampleValue(source, variable, draft, existingExample)),
    };
  }

  return {
    body_text: [variables.map((variable) => getExampleValue(source, variable, draft, existingExample))],
  };
}

function buildMetaButton(button: TemplateButtonDraft, index: number, draft: TemplateDraft) {
  if (button.type === 'QUICK_REPLY') {
    return { type: 'QUICK_REPLY', text: button.text?.trim() };
  }
  if (button.type === 'PHONE_NUMBER') {
    return { type: 'PHONE_NUMBER', text: button.text?.trim(), phone_number: button.phone_number?.trim() };
  }
  if (button.type === 'FLOW') {
    return { type: 'FLOW', text: button.text?.trim(), flow_id: button.flow_id?.trim() };
  }
  if (button.type === 'COPY_CODE') {
    return { type: 'COPY_CODE', example: button.example?.trim() };
  }

  const variables = extractTemplateVariables(button.url);
  return {
    type: 'URL',
    text: button.text?.trim(),
    url: button.url?.trim(),
    ...(variables.length
      ? { example: variables.map((variable) => getExampleValue(`button:${index}`, variable, draft, button.example)) }
      : {}),
  };
}

function getExampleValue(
  source: 'header' | 'body' | `button:${number}`,
  variable: string,
  draft: TemplateDraft,
  existingExample?: unknown
): string {
  if (source === 'header') {
    return (
      draft.examples?.header?.[variable] ||
      extractExistingTextExample(existingExample, 'header', variable) ||
      ''
    ).trim();
  }

  if (source === 'body') {
    return (
      draft.examples?.body?.[variable] ||
      extractExistingTextExample(existingExample, 'body', variable) ||
      ''
    ).trim();
  }

  const buttonIndex = source.split(':')[1];
  return (
    draft.examples?.buttons?.[buttonIndex]?.[variable] ||
    (typeof existingExample === 'string' ? existingExample : '') ||
    ''
  ).trim();
}

function extractExistingTextExample(existingExample: unknown, source: 'header' | 'body', variable: string): string {
  if (!existingExample || typeof existingExample !== 'object') return '';
  const example = existingExample as Record<string, unknown>;
  const namedKey = source === 'header' ? 'header_text_named_params' : 'body_text_named_params';
  const positionalKey = source === 'header' ? 'header_text' : 'body_text';

  const named = example[namedKey];
  if (Array.isArray(named)) {
    const match = named.find((item) => item && typeof item === 'object' && (item as any).param_name === variable);
    if (match && typeof (match as any).example === 'string') {
      return (match as any).example;
    }
  }

  const positional = example[positionalKey];
  if (Array.isArray(positional)) {
    if (source === 'body' && Array.isArray(positional[0])) {
      const index = Number(variable) - 1;
      return typeof positional[0][index] === 'string' ? positional[0][index] : '';
    }
    const index = Number(variable) - 1;
    return typeof positional[index] === 'string' ? positional[index] : '';
  }

  return '';
}

function extractHeaderHandle(example: unknown): string {
  if (typeof example === 'string') return example.trim();
  if (!example || typeof example !== 'object') return '';
  const handle = (example as any).header_handle;
  return Array.isArray(handle) && typeof handle[0] === 'string' ? handle[0].trim() : '';
}

function orderComponents(components: TemplateComponentDraft[]) {
  const order = { HEADER: 0, BODY: 1, FOOTER: 2, BUTTONS: 3 };
  return [...components].sort((a, b) => order[a.type] - order[b.type]);
}

function clampAuthExpiration(value: number | undefined): number {
  if (!Number.isFinite(value)) return 10;
  return Math.min(
    WHATSAPP_TEMPLATE_LIMITS.authCodeExpirationMax,
    Math.max(WHATSAPP_TEMPLATE_LIMITS.authCodeExpirationMin, Math.trunc(value as number))
  );
}

function trimOrDefault(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function pushIssue(
  issues: TemplateValidationIssue[],
  path: Array<string | number>,
  message: string,
  level: TemplateValidationIssueLevel = 'error'
) {
  issues.push({ level, path, message });
}

function calculateReadinessScore(issues: TemplateValidationIssue[]) {
  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.filter((issue) => issue.level === 'warning').length;
  return Math.max(0, Math.min(100, 100 - errors * 18 - warnings * 8));
}
