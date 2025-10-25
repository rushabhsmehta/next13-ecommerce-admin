import { Prisma } from '@prisma/client';
import type { WhatsAppAutomation, WhatsAppMessage, WhatsAppSession } from '@prisma/client';
import prisma from './prismadb';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
// Prefer the explicit "BUSINESS_ACCOUNT_ID" env var if present (common naming)
const META_WHATSAPP_BUSINESS_ID =
  process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.META_WHATSAPP_BUSINESS_ID || '';
const META_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}`;

// We'll lazily resolve the effective WhatsApp Business Account (WABA) id.
// Lazily cached resolved WABA id. Initialize from env (if provided).
let resolvedBusinessId: string | null = META_WHATSAPP_BUSINESS_ID || null;

async function resolveBusinessId(): Promise<string> {
  if (resolvedBusinessId) return resolvedBusinessId;

  // If env provided, use it
  if (META_WHATSAPP_BUSINESS_ID) {
    resolvedBusinessId = META_WHATSAPP_BUSINESS_ID;
    return resolvedBusinessId;
  }

  // Fallback: derive WABA from phone number node (/PHONE_ID?fields=whatsapp_business_account)
  if (!META_WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Missing META_WHATSAPP_PHONE_NUMBER_ID required to auto-resolve business id');
  }

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_business_account`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}` }
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) {
    throw new Error(
      `Failed to auto-resolve WABA id from phone number: ${payload?.error?.message || res.statusText}`
    );
  }

  const waba = payload?.whatsapp_business_account?.id;
  if (!waba) {
    throw new Error('Phone number record did not include whatsapp_business_account id');
  }

  resolvedBusinessId = String(waba);
  return resolvedBusinessId;
}

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

const debugMode = process.env.WHATSAPP_DEBUG === '1';

type GraphHttpMethod = 'GET' | 'POST' | 'DELETE';

type GraphRequestOptions = {
  method?: GraphHttpMethod;
  body?: any;
  searchParams?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string>;
};

export class GraphApiError extends Error {
  constructor(public status: number, message: string, public response: any) {
    super(message);
    this.name = 'GraphApiError';
  }
}

export async function graphRequest<T>(endpoint: string, options: GraphRequestOptions = {}): Promise<T> {
  if (!META_WHATSAPP_ACCESS_TOKEN || !META_WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error(
      'Missing Meta WhatsApp credentials. Please set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID'
    );
  }

  const url = new URL(`${META_API_BASE}/${endpoint}`);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body && options.body instanceof FormData;

  if (isFormData) {
    delete headers['Content-Type'];
  }

  // Debug logging - request details
  console.log('========== WhatsApp API Request ==========');
  console.log('[URL]:', url.toString());
  console.log('[Method]:', options.method || 'GET');
  console.log('[Endpoint]:', endpoint);
  console.log('[Request Body]:', JSON.stringify(options.body, null, 2));
  console.log('==========================================');

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  let payload: any = null;
  let responseText = '';
  try {
    responseText = await response.text();
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (err) {
    if (debugMode) {
      console.error('[WhatsApp] Failed to parse response:', { responseText, error: err });
    }
    if (!response.ok) {
      throw new GraphApiError(response.status, `Meta API responded with HTTP ${response.status}`, null);
    }
  }

  // Debug logging - response details
  console.log('========== WhatsApp API Response ==========');
  console.log('[Status]:', response.status);
  console.log('[OK]:', response.ok);
  console.log('[Response Body]:', JSON.stringify(payload, null, 2));
  console.log('===========================================');

  if (!response.ok || (payload && payload.error)) {
    const errorMessage =
      payload?.error?.message ||
      payload?.error?.error_data?.details ||
      `Meta API request failed (${response.status})`;
    
    // Enhanced error logging
    console.error('========== WhatsApp API ERROR ==========');
    console.error('[Endpoint]:', endpoint);
    console.error('[Method]:', options.method || 'GET');
    console.error('[Status]:', response.status);
    console.error('[Error Code]:', payload?.error?.code);
    console.error('[Error Subcode]:', payload?.error?.error_subcode);
    console.error('[Error Message]:', errorMessage);
    console.error('[Full Error]:', JSON.stringify(payload?.error, null, 2));
    console.error('[Request Body]:', JSON.stringify(options.body, null, 2));
    console.error('[Full Response]:', JSON.stringify(payload, null, 2));
    console.error('========================================');
    
    throw new GraphApiError(response.status, errorMessage, payload);
  }

  return payload as T;
}

export async function graphBusinessRequest<T>(endpoint: string, options: GraphRequestOptions = {}): Promise<T> {
  if (!META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing Meta WhatsApp access token. Set META_WHATSAPP_ACCESS_TOKEN.');
  }

  // Resolve the business id (WABA) lazily; if not set in env, derive from phone number
  const businessId = await resolveBusinessId();
  const BUSINESS_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${businessId}`;

  const url = new URL(`${BUSINESS_BASE}/${endpoint}`);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body && options.body instanceof FormData;

  if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  let payload: any = null;
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new GraphApiError(response.status, `Meta API responded with HTTP ${response.status}`, null);
    }
  }

  if (!response.ok || (payload && payload.error)) {
    const errorMessage =
      payload?.error?.message ||
      payload?.error?.error_data?.details ||
      `Meta API request failed (${response.status})`;
    if (debugMode) {
      console.error('[WhatsApp] Graph API business error', {
        endpoint,
        status: response.status,
        payload,
      });
    }
    throw new GraphApiError(response.status, errorMessage, payload);
  }

  return payload as T;
}

export async function graphFlowRequest<T>(endpoint: string, options: GraphRequestOptions = {}): Promise<T> {
  if (!META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing Meta WhatsApp access token. Set META_WHATSAPP_ACCESS_TOKEN.');
  }

  const FLOW_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
  const url = new URL(`${FLOW_BASE}/${endpoint}`);
  if (debugMode) {
    console.log('========== WhatsApp Flow API Request ==========', {
      url: url.toString(),
      endpoint,
      method: options.method || 'GET',
      body: options.body,
    });
  }
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body && options.body instanceof FormData;

  if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  let payload: any = null;
  try {
    const text = await response.text();
    payload = text ? JSON.parse(text) : null;
  } catch (err) {
    if (!response.ok) {
      throw new GraphApiError(response.status, `Meta API responded with HTTP ${response.status}`, null);
    }
  }

  if (!response.ok || (payload && payload.error)) {
    const errorMessage =
      payload?.error?.message ||
      payload?.error?.error_data?.details ||
      `Meta API request failed (${response.status})`;
    if (debugMode) {
      console.error('[WhatsApp] Graph API flow error', {
        endpoint,
        status: response.status,
        payload,
      });
    }
    throw new GraphApiError(response.status, errorMessage, payload);
  }

  return payload as T;
}

function normalizeE164(input: string) {
  if (!input) return input;
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return trimmed;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return `+${digits}`;
}

type GraphMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'sticker'
  | 'interactive'
  | 'reaction'
  | 'template';

type GraphMessagePayload = {
  messaging_product: 'whatsapp';
  to: string;
  type: GraphMessageType;
  text?: { body: string; preview_url?: boolean };
  image?: { link?: string; caption?: string; id?: string };
  video?: { link?: string; caption?: string; id?: string };
  audio?: { link?: string; id?: string };
  document?: { link?: string; caption?: string; filename?: string; id?: string };
  sticker?: { link?: string; id?: string };
  interactive?: Record<string, any>;
  reaction?: { message_id: string; emoji: string };
  context?: { message_id?: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<Record<string, any>>;
  };
};

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveRow {
  id: string;
  title: string;
  description?: string;
}

export interface InteractiveSection {
  title?: string;
  rows: InteractiveRow[];
}

export interface InteractiveHeader {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  mediaUrl?: string;
}

export interface InteractiveProductItem {
  productRetailerId: string;
  title?: string;
  description?: string;
}

export interface InteractiveProductSection {
  title?: string;
  productItems: InteractiveProductItem[];
}

interface WhatsAppInteractiveBasePayload {
  body: string;
  footer?: string;
  header?: InteractiveHeader;
}

export interface WhatsAppInteractiveButtonPayload extends WhatsAppInteractiveBasePayload {
  type: 'button';
  buttons: InteractiveButton[];
  actionTitle?: string;
}

export interface WhatsAppInteractiveListPayload extends WhatsAppInteractiveBasePayload {
  type: 'list';
  sections: InteractiveSection[];
  actionTitle?: string;
}

export interface WhatsAppInteractiveProductPayload extends WhatsAppInteractiveBasePayload {
  type: 'product';
  catalogId: string;
  productRetailerId: string;
  header?: { type: 'text'; text: string };
}

export interface WhatsAppInteractiveProductListPayload extends WhatsAppInteractiveBasePayload {
  type: 'product_list';
  catalogId: string;
  header?: { type: 'text'; text: string };
  sections: InteractiveProductSection[];
}

export type WhatsAppInteractiveMessagePayload =
  | WhatsAppInteractiveButtonPayload
  | WhatsAppInteractiveListPayload
  | WhatsAppInteractiveProductPayload
  | WhatsAppInteractiveProductListPayload;

export interface SessionUpdateInput {
  flowToken?: string;
  waId?: string;
  phoneNumber?: string;
  contextPatch?: Record<string, any>;
  lastScreen?: string;
  lastAction?: string;
  lastMessageId?: string;
  expiresAt?: Date | string | number | null;
}

function mergeContext(
  base: Prisma.JsonValue | null | undefined,
  patch?: Record<string, any>
): Prisma.InputJsonValue | undefined {
  if (!patch) {
    return base as Prisma.InputJsonValue | undefined;
  }
  const baseObj =
    typeof base === 'object' && base !== null ? (base as Record<string, any>) : {};
  return JSON.parse(JSON.stringify({ ...baseObj, ...patch }));
}

function parseDateInput(input?: Date | string | number | null): Date | null {
  if (input === undefined || input === null) {
    return null;
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function buildInteractivePayload(interactive: WhatsAppInteractiveMessagePayload) {
  const base: Record<string, any> = {
    type: interactive.type,
    body: { text: interactive.body },
  };

  if (interactive.footer) {
    base.footer = { text: interactive.footer };
  }

  if (interactive.header) {
    if (interactive.header.type === 'text') {
      base.header = { type: 'text', text: interactive.header.text };
    } else if ('mediaUrl' in interactive.header && interactive.header.mediaUrl) {
      base.header = {
        type: interactive.header.type,
        [interactive.header.type]: {
          link: interactive.header.mediaUrl,
        },
      };
    }
  }

  switch (interactive.type) {
    case 'button': {
      const buttons = interactive.buttons.map((button) => ({
        type: 'reply',
        reply: {
          id: button.id,
          title: button.title,
        },
      }));
      base.action = { buttons };
      break;
    }
    case 'list': {
      const sections = interactive.sections.map((section) => ({
        title: section.title,
        rows: section.rows.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
        })),
      }));
      base.action = {
        button: interactive.actionTitle || 'Select',
        sections,
      };
      break;
    }
    case 'product': {
      // https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#product-messages
      base.action = {
        catalog_id: interactive.catalogId,
        product_retailer_id: interactive.productRetailerId,
      };
      break;
    }
    case 'product_list': {
      // https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#multi-product-messages
      const sections = interactive.sections.map((section) => ({
        title: section.title,
        product_items: section.productItems.map((item) => ({
          product_retailer_id: item.productRetailerId,
        })),
      }));

      const resolvedHeaderText = (() => {
        if (interactive.header?.text) {
          return interactive.header.text;
        }
        const firstTitle = interactive.sections.find((section) => !!section.title)?.title;
        return firstTitle || 'Catalog';
      })();

      base.header = { type: 'text', text: resolvedHeaderText };
      base.action = {
        catalog_id: interactive.catalogId,
        sections,
      };
      break;
    }
    default: {
      throw new Error(`Unsupported interactive message type: ${(interactive as any).type}`);
    }
  }

  return base;
}

function buildMessagePreview(payload: GraphMessagePayload): string {
  switch (payload.type) {
    case 'text':
      return payload.text?.body || '[text]';
    case 'interactive':
      return (`[interactive:${(payload.interactive as any)?.type || 'generic'}] ${
        (payload.interactive as any)?.body?.text || ''
      }`).trim();
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker':
      return `[${payload.type}]`;
    case 'reaction':
      return `[reaction ${(payload.reaction?.emoji as string) || ''}]`;
    case 'template':
      return `[template ${payload.template?.name}]`;
    default:
      return '[message]';
  }
}

function substituteTemplateVariables(templateBody: string, params: Array<string | number>): string {
  if (!templateBody || !params || params.length === 0) {
    return templateBody || '';
  }
  
  let result = templateBody;
  params.forEach((value, index) => {
    // Replace {{1}}, {{2}}, etc. with actual values
    const placeholder = `{{${index + 1}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), String(value));
  });
  
  return result;
}

function templatePreview(templateName: string, components?: Array<Record<string, any>>): string {
  // Try to extract actual message content from body component
  const bodyComponent = components?.find((c) => c.type === 'body' || c.type === 'BODY');
  
  // If body component has parameters, try to build a readable preview
  if (bodyComponent?.parameters && Array.isArray(bodyComponent.parameters)) {
    const params = bodyComponent.parameters.map((p: any) => p.text || p.value || '').filter(Boolean);
    if (params.length > 0) {
      // If we have parameters, include them in the preview
      return `Template: ${templateName} (${params.join(', ')})`;
    }
  }
  
  // If body has text template, return it
  if (bodyComponent?.text) {
    return bodyComponent.text;
  }
  
  // Fallback to template name
  return `Template: ${templateName}`;
}

function buildTemplateComponents(
  bodyParams: Array<string | number> = [],
  buttonParams: Array<any> = [],
  components?: Array<Record<string, any>>,
  headerParams?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: { link: string };
    video?: { link: string };
    document?: { link: string; filename?: string };
  }
): Array<Record<string, any>> | undefined {
  console.log('[buildTemplateComponents] Called with:', {
    bodyParams,
    bodyParamsLength: bodyParams.length,
    buttonParams,
    buttonParamsLength: buttonParams.length,
    hasComponents: !!components,
    componentsLength: components?.length,
    headerParams,
  });

  if (components && components.length) {
    console.log('[buildTemplateComponents] Returning provided components:', components);
    return components;
  }

  const built: Array<Record<string, any>> = [];

  // Add header component if provided
  if (headerParams) {
    const headerComponent: any = {
      type: 'header',
      parameters: [],
    };

    if (headerParams.type === 'text' && headerParams.text) {
      headerComponent.parameters.push({
        type: 'text',
        text: headerParams.text,
      });
    } else if (headerParams.type === 'image' && headerParams.image) {
      headerComponent.parameters.push({
        type: 'image',
        image: headerParams.image,
      });
    } else if (headerParams.type === 'video' && headerParams.video) {
      headerComponent.parameters.push({
        type: 'video',
        video: headerParams.video,
      });
    } else if (headerParams.type === 'document' && headerParams.document) {
      headerComponent.parameters.push({
        type: 'document',
        document: headerParams.document,
      });
    }

    if (headerComponent.parameters.length > 0) {
      built.push(headerComponent);
    }
  }

  if (bodyParams.length) {
    built.push({
      type: 'body',
      parameters: bodyParams.map((value) => ({
        type: 'text',
        text: String(value),
      })),
    });
  }

  if (buttonParams.length) {
    const normalizeParam = (p: any) => {
      if (!p) return p;
      const type = (p.type || p.TYPE || '').toString().toLowerCase();
      if (type === 'action') {
        return { type: 'action', action: p.action || p.ACTION || p.value || p };
      }
      if (type === 'text') {
        return { type: 'text', text: String(p.text ?? p.value ?? p) };
      }
      if (type === 'payload') {
        return { type: 'payload', payload: p.payload };
      }
      // Fallback: try common fields
      if (p.action) return { type: 'action', action: p.action };
      if (p.text) return { type: 'text', text: String(p.text) };
      return p;
    };

    buttonParams.forEach((buttonConfig: any, idx: number) => {
      if (!buttonConfig) return;

      // If caller provided a full config object, normalize casing
      if (buttonConfig.type) {
        const rawType = String(buttonConfig.type || '').toLowerCase();
        if (rawType === 'button') {
          const subTypeRaw = String(buttonConfig.sub_type || buttonConfig.subType || buttonConfig.subType || '').toLowerCase();
          const parameters = Array.isArray(buttonConfig.parameters)
            ? buttonConfig.parameters.map(normalizeParam)
            : [];

          built.push({
            type: 'BUTTON',
            sub_type: (subTypeRaw || 'url').toUpperCase(),
            index: typeof buttonConfig.index === 'number' ? buttonConfig.index : idx,
            parameters: parameters.map((p: any) => {
              if (!p) return p;
              if ((p.type || '').toString().toLowerCase() === 'action') return { ...p, type: 'ACTION' };
              return p;
            }),
          });
          return;
        }

        // If it's not a button (unexpected), push as provided
        built.push(buttonConfig);
        return;
      }

      // If it's a simple array or primitive, construct a URL button with text params
      const parameters = Array.isArray(buttonConfig)
        ? buttonConfig.map((v: any) => ({ type: 'text', text: String(v) }))
        : [{ type: 'text', text: String(buttonConfig) }];

      built.push({
        type: 'BUTTON',
        sub_type: 'URL',
        index: idx,
        parameters,
      });
    });
  }

  // Return undefined if no components were built (templates with no variables)
  const result = built.length > 0 ? built : undefined;
  
  console.log('[buildTemplateComponents] Output:', {
    builtLength: built.length,
    built,
    result,
    willReturnUndefined: result === undefined,
  });
  
  return result;
}

function extractTemplateVariables(body: string): string[] {
  const matches = body.match(/\{\{(\d+)\}\}/g) || [];
  return Array.from(new Set(matches.map((match) => match.replace(/[{}]/g, ''))));
}

async function persistOutboundMessage(data: {
  to: string;
  message?: string | null;
  status: string;
  direction?: 'outbound' | 'inbound';
  messageSid?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, any>;
  payload?: GraphMessagePayload | Record<string, any> | null;
  sessionId?: string | null;
  automationId?: string | null;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  waId?: string | null;
}): Promise<WhatsAppMessage> {
  const toAddress = data.to ? `whatsapp:${normalizeE164(data.to)}` : null;

  return prisma.whatsAppMessage.create({
    data: {
      to: toAddress ?? undefined,
      from: `whatsapp:${META_WHATSAPP_PHONE_NUMBER_ID}`,
      message: data.message ?? undefined,
      status: data.status,
      direction: data.direction ?? 'outbound',
      messageSid: data.messageSid ?? undefined,
      errorMessage: data.errorMessage ?? undefined,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
      payload: data.payload ? (data.payload as Prisma.InputJsonValue) : undefined,
      sessionId: data.sessionId ?? undefined,
      automationId: data.automationId ?? undefined,
      scheduledAt: data.scheduledAt ?? undefined,
      sentAt: data.sentAt ?? undefined,
      waId: data.waId ?? undefined,
    },
  });
}

async function ensureSession(
  hints: (SessionUpdateInput & { createIfMissing?: boolean }) = {}
): Promise<WhatsAppSession | null> {
  const normalizedPhone = hints.phoneNumber ? normalizeE164(hints.phoneNumber) : undefined;
  let session: WhatsAppSession | null = null;

  if (hints.flowToken) {
    session = await prisma.whatsAppSession.findUnique({ where: { flowToken: hints.flowToken } });
  }

  if (!session && hints.waId) {
    session = await prisma.whatsAppSession.findFirst({
      where: { waId: hints.waId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!session && normalizedPhone) {
    session = await prisma.whatsAppSession.findFirst({
      where: { phoneNumber: normalizedPhone, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    });
  }

  const context = mergeContext(session?.context ?? null, hints.contextPatch);
  const expiresAtDate = parseDateInput(hints.expiresAt);

  if (!session) {
    if (hints.createIfMissing === false) {
      return null;
    }
    if (!normalizedPhone && !hints.flowToken && !hints.waId) {
      return null;
    }

    session = await prisma.whatsAppSession.create({
      data: {
        phoneNumber: normalizedPhone,
        waId: hints.waId,
        flowToken: hints.flowToken,
        context,
        lastScreen: hints.lastScreen,
        lastAction: hints.lastAction,
        lastMessageId: hints.lastMessageId,
        lastInteraction: new Date(),
        expiresAt: expiresAtDate ?? undefined,
      },
    });
  } else {
    session = await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        phoneNumber: normalizedPhone ?? session.phoneNumber,
        waId: hints.waId ?? session.waId,
        flowToken: hints.flowToken ?? session.flowToken,
        context: context ?? (session.context === null ? undefined : session.context as Prisma.InputJsonValue),
        lastScreen: hints.lastScreen ?? session.lastScreen,
        lastAction: hints.lastAction ?? session.lastAction,
        lastMessageId: hints.lastMessageId ?? session.lastMessageId,
        lastInteraction: new Date(),
        expiresAt: expiresAtDate ?? session.expiresAt,
      },
    });
  }

  return session;
}

async function dispatchMessagePayload(payload: GraphMessagePayload) {
  return graphRequest<{
    messages?: Array<{ id: string }>;
    contacts?: Array<{ wa_id: string }>;
    id?: string;
  }>('messages', {
    method: 'POST',
    body: payload,
  });
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  dbRecord?: any;
  provider?: 'meta';
  rawResponse?: any;
}

interface AnalyticsEventInput {
  eventType: string;
  payload?: Record<string, any>;
  sessionId?: string | null;
  messageId?: string | null;
  automationId?: string | null;
  observedAt?: Date;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput) {
  return prisma.whatsAppAnalyticsEvent.create({
    data: {
      eventType: input.eventType,
      payload: input.payload ? (input.payload as Prisma.InputJsonValue) : undefined,
      sessionId: input.sessionId ?? undefined,
      messageId: input.messageId ?? undefined,
      automationId: input.automationId ?? undefined,
      observedAt: input.observedAt ?? new Date(),
    },
  });
}

type AutomationEventContext = {
  session?: WhatsAppSession | null;
  message?: WhatsAppMessage | null | undefined;
  payload?: Record<string, any>;
  analyticsEventId?: string;
  params?: any;
  error?: string;
};

async function runAutomations(eventType: string, context: AutomationEventContext = {}) {
  const sessionId = context.session?.id ?? context.message?.sessionId ?? null;
  const skipAutomationId =
    context.message?.automationId ||
    (context.payload && context.payload.automationId) ||
    context.params?.automationId;

  const automations = await prisma.whatsAppAutomation.findMany({
    where: { isActive: true, triggerType: eventType },
    orderBy: { updatedAt: 'desc' },
    take: 25,
  });

  for (const automation of automations) {
    if (skipAutomationId && automation.id === skipAutomationId) {
      continue;
    }

    try {
      await handleAutomation(automation, eventType, context);
    } catch (automationError: any) {
      if (debugMode) {
        console.error('Automation execution failed', {
          automationId: automation.id,
          error: automationError,
        });
      }
      await recordAnalyticsEvent({
        eventType: 'automation.failed',
        sessionId,
        automationId: automation.id,
        payload: {
          error:
            automationError instanceof Error
              ? automationError.message
              : String(automationError),
          eventType,
        },
      });
    }
  }
}

async function handleAutomation(
  automation: WhatsAppAutomation,
  eventType: string,
  context: AutomationEventContext
) {
  const sessionId = context.session?.id ?? context.message?.sessionId ?? null;

  await recordAnalyticsEvent({
    eventType: 'automation.triggered',
    sessionId,
    automationId: automation.id,
    payload: {
      automationName: automation.name,
      triggerType: eventType,
    },
  });

  const actionType = automation.actionType;
  const actionConfig = automation.actionConfig as Record<string, any> | null;

  if (!actionConfig) {
    return;
  }

  switch (actionType) {
    case 'template': {
      const phoneNumber =
        context.session?.phoneNumber ||
        context.message?.to?.replace('whatsapp:', '') ||
        '';
      if (!phoneNumber) {
        throw new Error('Automation template action requires session phone number');
      }
      await sendWhatsAppTemplate({
        to: phoneNumber,
        templateName: actionConfig.templateName,
        languageCode: actionConfig.languageCode || 'en_US',
        bodyParams: actionConfig.bodyParams || [],
        buttonParams: actionConfig.buttonParams || [],
        saveToDb: true,
        sessionHints: {
          flowToken: context.session?.flowToken || undefined,
          waId: context.session?.waId || undefined,
          phoneNumber,
        },
        automationId: automation.id,
        metadata: {
          automationName: automation.name,
          triggerType: eventType,
        },
      });
      break;
    }
    case 'webhook': {
      if (!actionConfig.url) {
        throw new Error('Automation webhook action is missing a url');
      }
      await fetch(String(actionConfig.url), {
        method: actionConfig.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(actionConfig.headers || {}),
        },
        body: JSON.stringify({
          automationId: automation.id,
          automationName: automation.name,
          eventType,
          session: context.session,
          message: context.message,
          payload: context.payload,
        }),
      });
      break;
    }
    case 'tag': {
      if (!context.session || !Array.isArray(actionConfig.tags)) {
        return;
      }
      const existingContext =
        (context.session.context as Record<string, any> | null) || {};
      const tags = new Set<string>(
        Array.isArray(existingContext.tags) ? existingContext.tags : []
      );
      actionConfig.tags.forEach((tag: string) => {
        if (typeof tag === 'string' && tag.trim()) {
          tags.add(tag.trim());
        }
      });
      await prisma.whatsAppSession.update({
        where: { id: context.session.id },
        data: {
          context: mergeContext(existingContext, { tags: Array.from(tags) }),
        },
      });
      break;
    }
    default: {
      if (debugMode) {
        console.warn('Unhandled WhatsApp automation action type', {
          actionType,
          automationId: automation.id,
        });
      }
    }
  }
}

export interface SendWhatsAppMessageParams {
  to: string;
  message?: string;
  saveToDb?: boolean;
  media?: {
    url?: string;
    id?: string;
    filename?: string;
    caption?: string;
    mimeType?: string;
    type?: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  };
  previewUrl?: boolean;
  interactive?: WhatsAppInteractiveMessagePayload;
  reaction?: { messageId: string; emoji: string };
  context?: { messageId?: string };
  scheduleFor?: Date | string | number;
  metadata?: Record<string, any>;
  sessionHints?: SessionUpdateInput;
  automationId?: string;
  tags?: string[];
  type?: 'text' | 'media' | 'interactive' | 'reaction';
  waId?: string;
}

function buildMessagePayload(
  params: SendWhatsAppMessageParams & { destination: string }
): GraphMessagePayload {
  const base: GraphMessagePayload = {
    messaging_product: 'whatsapp',
    to: params.destination,
    type: 'text',
  };

  if (params.reaction) {
    base.type = 'reaction';
    base.reaction = {
      message_id: params.reaction.messageId,
      emoji: params.reaction.emoji,
    };
    return base;
  }

  if (params.interactive) {
    base.type = 'interactive';
    base.interactive = buildInteractivePayload(params.interactive);
    if (params.context?.messageId) {
      base.context = { message_id: params.context.messageId };
    }
    return base;
  }

  if (params.media?.url || params.media?.id) {
    const mediaType = params.media.type || 'image';
    base.type = mediaType as GraphMessageType;
    switch (mediaType) {
      case 'video':
        base.video = params.media.id
          ? { id: params.media.id }
          : { link: String(params.media.url), caption: params.media.caption };
        break;
      case 'audio':
        base.audio = params.media.id
          ? { id: params.media.id }
          : { link: String(params.media.url) };
        break;
      case 'document':
        base.document = params.media.id
          ? { id: params.media.id }
          : {
              link: String(params.media.url),
              caption: params.media.caption,
              filename: params.media.filename,
            };
        break;
      case 'sticker':
        base.sticker = params.media.id
          ? { id: params.media.id }
          : { link: String(params.media.url) };
        break;
      default:
        base.image = params.media.id
          ? { id: params.media.id }
          : { link: String(params.media.url), caption: params.media.caption };
        break;
    }
    if (params.context?.messageId) {
      base.context = { message_id: params.context.messageId };
    }
    return base;
  }

  if (!params.message) {
    throw new Error('No message, media, interactive content, or reaction provided');
  }

  base.type = 'text';
  base.text = {
    body: params.message,
    preview_url: params.previewUrl ?? false,
  };
  if (params.context?.messageId) {
    base.context = { message_id: params.context.messageId };
  }
  return base;
}

export async function sendWhatsAppMessage(
  params: SendWhatsAppMessageParams
): Promise<WhatsAppMessageResponse> {
  const destination = normalizeE164(params.to);
  let session: WhatsAppSession | null = null;
  let payload: GraphMessagePayload | null = null;
  const sessionHints: SessionUpdateInput = {
    ...(params.sessionHints || {}),
    phoneNumber: destination,
    waId: params.waId || params.sessionHints?.waId,
  };

  try {
    payload = buildMessagePayload({ ...params, destination });
    session = await ensureSession({
      ...sessionHints,
      lastAction: 'message.prepare',
    });

    const scheduleDate = parseDateInput(params.scheduleFor);
    if (
      scheduleDate &&
      scheduleDate.getTime() > Date.now() + 1000 &&
      (params.saveToDb ?? true)
    ) {
      const record = await persistOutboundMessage({
        to: destination,
        message: params.message || buildMessagePreview(payload),
        status: 'scheduled',
        metadata: params.metadata,
        payload,
        sessionId: session?.id ?? undefined,
        automationId: params.automationId,
        scheduledAt: scheduleDate,
        waId: session?.waId ?? params.waId,
      });

      await recordAnalyticsEvent({
        eventType: 'message.scheduled',
        sessionId: session?.id ?? undefined,
        messageId: record.id,
        payload: {
          type: payload.type,
          scheduledFor: scheduleDate.toISOString(),
        },
      });

      return {
        success: true,
        messageSid: undefined,
        dbRecord: record,
        provider: 'meta',
        rawResponse: { scheduled: true, scheduledFor: scheduleDate.toISOString() },
      };
    }

    const response = await dispatchMessagePayload(payload);
    const messageSid = response?.messages?.[0]?.id || response?.id;

    let dbRecord: WhatsAppMessage | undefined;
    if (params.saveToDb !== false) {
      dbRecord = await persistOutboundMessage({
        to: destination,
        message: params.message || buildMessagePreview(payload),
        status: 'sent',
        messageSid,
        metadata: params.metadata,
        payload,
        sessionId: session?.id ?? undefined,
        automationId: params.automationId,
        waId: response?.contacts?.[0]?.wa_id || session?.waId || params.waId,
        sentAt: new Date(),
      });
    }

    const analytics = await recordAnalyticsEvent({
      eventType: 'message.sent',
      sessionId: session?.id ?? undefined,
      messageId: dbRecord?.id ?? undefined,
      payload: {
        type: payload.type,
        to: destination,
        hasMetadata: !!params.metadata,
      },
    });

    await runAutomations('message.sent', {
      session,
      message: dbRecord,
      payload: { type: payload.type },
      analyticsEventId: analytics.id,
      params,
    });

    return {
      success: true,
      messageSid,
      dbRecord,
      provider: 'meta',
      rawResponse: response,
    };
  } catch (error: any) {
    if (debugMode) {
      console.error('Error sending WhatsApp message:', error);
    }

    let dbRecord: WhatsAppMessage | undefined;
    if (params.saveToDb !== false) {
      try {
  const fallbackSession = session ?? (await ensureSession({ ...sessionHints }));
        dbRecord = await persistOutboundMessage({
          to: destination,
          message:
            params.message ||
            buildMessagePreview(
              payload ||
                ({
                  messaging_product: 'whatsapp',
                  to: destination,
                  type: 'text',
                  text: { body: params.message || '[send failed]' },
                } as GraphMessagePayload)
            ),
          status: 'failed',
          errorMessage: error?.message || 'Unknown error',
          metadata: params.metadata,
          payload: payload || undefined,
          sessionId: fallbackSession?.id ?? undefined,
          automationId: params.automationId,
          waId: fallbackSession?.waId ?? params.waId,
        });

        await recordAnalyticsEvent({
          eventType: 'message.failed',
          sessionId: fallbackSession?.id ?? undefined,
          messageId: dbRecord.id,
          payload: {
            error: error?.message,
            type: payload?.type,
          },
        });

        await runAutomations('message.failed', {
          session: fallbackSession,
          message: dbRecord,
          payload: { error: error?.message },
          params,
          error: error?.message,
        });
      } catch (persistError) {
        console.error('Error saving failed message to DB:', persistError);
      }
    }

    return {
      success: false,
      error: error?.message || 'Unknown error',
      provider: 'meta',
      dbRecord,
    };
  }
}

export function sendInteractiveMessage(
  params: Omit<SendWhatsAppMessageParams, 'interactive'> & {
    interactive: WhatsAppInteractiveMessagePayload;
  }
) {
  return sendWhatsAppMessage({
    ...params,
    interactive: params.interactive,
    type: 'interactive',
  });
}

export function scheduleWhatsAppMessage(
  params: SendWhatsAppMessageParams & { scheduleFor: Date | string | number }
) {
  return sendWhatsAppMessage({
    ...params,
    saveToDb: params.saveToDb !== false ? params.saveToDb : true,
  });
}

export async function processScheduledMessages(limit: number = 20) {
  const now = new Date();
  const scheduled = await prisma.whatsAppMessage.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: {
        lte: now,
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });

  const results: Array<{ id: string; status: 'sent' | 'failed'; error?: string }> = [];

  for (const job of scheduled) {
    if (!job.payload) {
      continue;
    }

    try {
      const payload = job.payload as unknown as GraphMessagePayload;
      const response = await dispatchMessagePayload(payload);
      const messageSid = response?.messages?.[0]?.id || response?.id;

      await prisma.whatsAppMessage.update({
        where: { id: job.id },
        data: {
          status: 'sent',
          messageSid: messageSid ?? job.messageSid ?? undefined,
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      await recordAnalyticsEvent({
        eventType: 'message.sent',
        sessionId: job.sessionId ?? undefined,
        messageId: job.id,
        payload: { scheduled: true },
      });

      const session = job.sessionId
        ? await prisma.whatsAppSession.findUnique({ where: { id: job.sessionId } })
        : null;
      await runAutomations('message.sent', {
        session,
        message: { ...job, status: 'sent', messageSid: messageSid ?? job.messageSid ?? undefined } as WhatsAppMessage,
        payload: { scheduled: true },
      });

      results.push({ id: job.id, status: 'sent' });
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error sending scheduled message';
      await prisma.whatsAppMessage.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage,
        },
      });

      await recordAnalyticsEvent({
        eventType: 'message.failed',
        sessionId: job.sessionId ?? undefined,
        messageId: job.id,
        payload: { scheduled: true, error: errorMessage },
      });

      const session = job.sessionId
        ? await prisma.whatsAppSession.findUnique({ where: { id: job.sessionId } })
        : null;
      await runAutomations('message.failed', {
        session,
        message: job,
        payload: { scheduled: true },
        error: errorMessage,
      });

      results.push({ id: job.id, status: 'failed', error: errorMessage });
    }
  }

  return results;
}

export interface SendTemplateParams {
  to: string;
  templateName: string;
  templateBody?: string; // Optional template body for better message preview
  languageCode?: string;
  bodyParams?: Array<string | number>;
  buttonParams?: Array<any>;
  headerParams?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: { link: string };
    video?: { link: string };
    document?: { link: string; filename?: string };
  };
  components?: Array<Record<string, any>>;
  saveToDb?: boolean;
  scheduleFor?: Date | string | number;
  metadata?: Record<string, any>;
  sessionHints?: SessionUpdateInput;
  automationId?: string;
  previewUrl?: boolean;
}

export async function sendWhatsAppTemplate(
  params: SendTemplateParams
): Promise<WhatsAppMessageResponse> {
  const effectiveButtonParams: Array<any> = Array.isArray(params.buttonParams)
    ? params.buttonParams.map((button) => (button ? { ...button } : button))
    : [];

  const normalizeSubType = (input: any) => {
    const raw = input?.sub_type ?? input?.subType ?? input?.type;
    return typeof raw === 'string' ? raw.toUpperCase() : '';
  };

  const flowDefaultsIndexMap = new Map<number, Record<string, any>>();
  const flowDefaultsTextMap = new Map<string, Record<string, any>>();

  const ensureActionPayload = (button: any, templateButton?: any) => {
    if (!button) {
      return;
    }

    button.type = 'BUTTON';
    button.sub_type = normalizeSubType(button) || 'FLOW';

    if (!Array.isArray(button.parameters)) {
      button.parameters = [];
    }

    let actionParam = button.parameters.find((param: any) => {
      const paramType = (param?.type || param?.TYPE || '').toString().toUpperCase();
      return paramType === 'ACTION';
    });

    if (!actionParam) {
      actionParam = { type: 'ACTION', action: {} };
      button.parameters.push(actionParam);
    }

    const actionPayload =
      actionParam.action && typeof actionParam.action === 'object'
        ? { ...actionParam.action }
        : {};

    const templateHints = templateButton && typeof templateButton === 'object' ? templateButton : {};
    const templateActionParam = Array.isArray(templateHints.parameters)
      ? templateHints.parameters.find((param: any) => {
          const paramType = (param?.type || param?.TYPE || '').toString().toUpperCase();
          return paramType === 'ACTION';
        })
      : undefined;
    const templateActionPayload = templateActionParam && typeof templateActionParam === 'object'
      ? templateActionParam.action || templateActionParam.ACTION || templateActionParam.payload || {}
      : {};

    const storedDefault = (() => {
      const candidates: Array<any> = [];
      const buttonIndex = typeof button?.index === 'number' ? button.index : undefined;
      const templateIndex = typeof templateHints?.index === 'number' ? templateHints.index : undefined;
      const templateButtonIndex = typeof templateHints?.button_index === 'number' ? templateHints.button_index : undefined;
      const textHints = [button?.text, templateHints?.text, templateHints?.title];

      if (typeof buttonIndex === 'number') {
        const match = flowDefaultsIndexMap.get(buttonIndex);
        if (match) candidates.push(match);
      }
      if (typeof templateIndex === 'number') {
        const match = flowDefaultsIndexMap.get(templateIndex);
        if (match) candidates.push(match);
      }
      if (typeof templateButtonIndex === 'number') {
        const match = flowDefaultsIndexMap.get(templateButtonIndex);
        if (match) candidates.push(match);
      }
      textHints.forEach((textCandidate) => {
        if (typeof textCandidate === 'string' && textCandidate.trim()) {
          const match = flowDefaultsTextMap.get(textCandidate.trim());
          if (match) candidates.push(match);
        }
      });

      return candidates.find((candidate) => candidate && typeof candidate === 'object');
    })();

    const hintSources: Array<Record<string, any>> = [];
    if (Object.keys(templateHints).length) {
      hintSources.push(templateHints);
    }
    if (templateActionPayload && typeof templateActionPayload === 'object') {
      hintSources.push(templateActionPayload as Record<string, any>);
    }
    if (storedDefault && typeof storedDefault === 'object') {
      hintSources.push(storedDefault as Record<string, any>);
      if (storedDefault.action && typeof storedDefault.action === 'object') {
        hintSources.push(storedDefault.action as Record<string, any>);
      }
    }

    const readHint = (...keys: string[]) => {
      for (const source of hintSources) {
        for (const key of keys) {
          if (!Object.prototype.hasOwnProperty.call(source, key)) {
            continue;
          }
          const value = source[key];
          if (value !== undefined && value !== null && value !== '') {
            return value;
          }
        }
      }
      return undefined;
    };

    const assignFromHints = (
      targetKey: string,
      keys: string[],
      transform?: (value: any) => any
    ) => {
      if (actionPayload[targetKey] !== undefined && actionPayload[targetKey] !== null && actionPayload[targetKey] !== '') {
        return;
      }
      const hint = readHint(...keys);
      if (hint === undefined) {
        return;
      }
      try {
        actionPayload[targetKey] = transform ? transform(hint) : hint;
      } catch {
        actionPayload[targetKey] = hint;
      }
    };

    const parseActionData = (value: any) => {
      if (value === undefined || value === null || value === '') {
        return value;
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    if (!actionPayload.flow_token) {
      const hintedToken = readHint(
        'flow_token',
        'flowToken',
        'default_flow_token',
        'defaultFlowToken'
      );
      actionPayload.flow_token =
        hintedToken || `auto_flow_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

  assignFromHints('flow_id', ['flow_id', 'flowId']);
  assignFromHints('flow_cta', ['flow_cta', 'flowCta']);
  assignFromHints('flow_action', ['flow_action', 'flowAction']);
  assignFromHints('flow_name', ['flow_name', 'flowName']);
  assignFromHints('flow_redirect_url', ['flow_redirect_url', 'flowRedirectUrl']);
  assignFromHints('flow_action_data', ['flow_action_data', 'flowActionData'], parseActionData);
  assignFromHints('flow_action_payload', ['flow_action_payload', 'flowActionPayload'], parseActionData);

    const navigateScreen = readHint('navigate_screen', 'navigateScreen');
    if (navigateScreen) {
      const existingData = actionPayload.flow_action_data && typeof actionPayload.flow_action_data === 'object'
        ? { ...actionPayload.flow_action_data }
        : {};
      if (!('screen' in existingData)) {
        existingData.screen = navigateScreen;
      }
      actionPayload.flow_action_data = existingData;
    }

    if (actionPayload.flow_action_data && !actionPayload.flow_action_payload) {
      actionPayload.flow_action_payload = actionPayload.flow_action_data;
    }

    delete actionPayload.flow_action_data;
    delete actionPayload.flow_action_payload;
    delete actionPayload.flow_id;
    delete actionPayload.flow_action;
    delete actionPayload.flow_message_version;
    delete actionPayload.flow_cta;
  delete actionPayload.flow_name;
    delete actionPayload.flow_redirect_url;
    delete actionPayload.flow_token_label;

    if (!button.text) {
      const textHint = readHint('text', 'title', 'label');
      if (typeof textHint === 'string' && textHint.trim()) {
        button.text = textHint;
      }
    }

    if (typeof button.index !== 'number') {
      const templateIndex =
        typeof templateHints.index === 'number'
          ? templateHints.index
          : typeof templateHints.button_index === 'number'
          ? templateHints.button_index
          : undefined;
      if (typeof templateIndex === 'number') {
        button.index = templateIndex;
      }
    }

    actionParam.action = actionPayload;
  };

  let storedTemplate:
    | {
        id: string;
        components: Prisma.JsonValue | null;
        flowDefaults: Prisma.JsonValue | null;
      }
    | null = null;

  try {
    storedTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { name: params.templateName },
      select: { id: true, components: true, flowDefaults: true },
    });
  } catch (lookupError) {
    console.warn('[WhatsApp] Failed to load stored template metadata:', lookupError);
  }

  const storedComponentsRaw = storedTemplate?.components;
  const storedComponents = (() => {
    if (storedComponentsRaw === null || storedComponentsRaw === undefined) {
      return undefined;
    }
    if (Array.isArray(storedComponentsRaw)) {
      return storedComponentsRaw as Array<Record<string, any>>;
    }
    if (typeof storedComponentsRaw === 'string') {
      try {
        const parsed = JSON.parse(storedComponentsRaw);
        if (Array.isArray(parsed)) {
          return parsed as Array<Record<string, any>>;
        }
      } catch (parseError) {
        console.warn('[WhatsApp] Failed to parse stored template components JSON:', parseError);
      }
    }
    return undefined;
  })();

  const existingFlowButtons = effectiveButtonParams.filter(
    (button) => normalizeSubType(button) === 'FLOW'
  );

  const storedFlowDefaultsRaw = storedTemplate?.flowDefaults;
  const storedFlowDefaults = (() => {
    if (!storedFlowDefaultsRaw) {
      return [] as Array<Record<string, any>>;
    }
    if (Array.isArray(storedFlowDefaultsRaw)) {
      return storedFlowDefaultsRaw as Array<Record<string, any>>;
    }
    if (typeof storedFlowDefaultsRaw === 'string') {
      try {
        const parsed = JSON.parse(storedFlowDefaultsRaw);
        if (Array.isArray(parsed)) {
          return parsed as Array<Record<string, any>>;
        }
      } catch (parseError) {
        console.warn('[WhatsApp] Failed to parse stored flow defaults JSON:', parseError);
      }
    }
    return [] as Array<Record<string, any>>;
  })();

  storedFlowDefaults.forEach((entry: Record<string, any>) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const idx = Number((entry as any).index);
    if (!Number.isNaN(idx)) {
      flowDefaultsIndexMap.set(idx, entry);
    }

    const text = (entry as any).text;
    if (typeof text === 'string' && text.trim()) {
      flowDefaultsTextMap.set(text.trim(), entry);
    }
  });

  const storedFlowButtons =
    storedComponents?.flatMap((component: any) => {
      if (!component || component.type !== 'BUTTONS' || !Array.isArray(component.buttons)) {
        return [] as Array<{ index: number; definition: Record<string, any> }>;
      }
      return component.buttons
        .map((button: any, idx: number) => ({
          index:
            typeof button?.index === 'number'
              ? button.index
              : typeof component?.index === 'number'
              ? component.index
              : idx,
          definition: button as Record<string, any>,
        }))
        .filter(({ definition }: { definition: Record<string, any> }) => normalizeSubType(definition) === 'FLOW');
    }) ?? [];

  if (!existingFlowButtons.length && storedFlowButtons.length) {
    storedFlowButtons.forEach(({ index, definition }) => {
      const normalizedIndex = typeof index === 'number' ? index : effectiveButtonParams.length;
      const synthesizedButton: any = {
        type: 'BUTTON',
        sub_type: 'FLOW',
        index: normalizedIndex,
      };

      if (definition?.text) {
        synthesizedButton.text = definition.text;
      }

      ensureActionPayload(synthesizedButton, definition);
      effectiveButtonParams.push(synthesizedButton);
    });

    console.log('[WhatsApp] Added flow button defaults from stored template', {
      templateName: params.templateName,
      synthesizedButtons: effectiveButtonParams.filter((btn) => normalizeSubType(btn) === 'FLOW'),
    });
  } else if (existingFlowButtons.length) {
    existingFlowButtons.forEach((button) => {
      if (normalizeSubType(button) !== 'FLOW') {
        return;
      }

      const matchedStored = storedFlowButtons.find(({ index, definition }) => {
        if (typeof button.index === 'number' && typeof index === 'number' && button.index === index) {
          return true;
        }
        if (definition?.text && button?.text && definition.text === button.text) {
          return true;
        }
        return false;
      });

      ensureActionPayload(button, matchedStored?.definition);
    });

    console.log('[WhatsApp] Normalized provided flow button parameters', {
      templateName: params.templateName,
      buttonCount: existingFlowButtons.length,
    });
  }

  const sanitizeFlowDefaults = (buttons: Array<any>) => {
    const sanitized: Array<Record<string, any>> = [];

    buttons.forEach((button) => {
      if (normalizeSubType(button) !== 'FLOW') {
        return;
      }

      const actionParam = Array.isArray(button.parameters)
        ? button.parameters.find((param: any) => {
            const paramType = (param?.type || param?.TYPE || '').toString().toUpperCase();
            return paramType === 'ACTION';
          })
        : undefined;

      const actionPayload = actionParam && typeof actionParam === 'object' ? actionParam.action : undefined;
      if (!actionPayload || typeof actionPayload !== 'object') {
        return;
      }

      const sanitizedAction: Record<string, any> = {};
      Object.entries(actionPayload).forEach(([key, value]) => {
        if (key === 'flow_token') {
          return;
        }
        if (value === undefined || value === null || value === '') {
          return;
        }
        sanitizedAction[key] = value;
      });

      const hasActionData = Object.keys(sanitizedAction).length > 0;
      const meta: Record<string, any> = {
        index: typeof button.index === 'number' ? button.index : undefined,
        text: button.text,
        action: hasActionData ? sanitizedAction : undefined,
      };

      if (typeof button.index !== 'number') {
        delete meta.index;
      }
      if (!button.text) {
        delete meta.text;
      }
      if (!hasActionData) {
        delete meta.action;
      }

      if (meta.index === undefined && !meta.text && !hasActionData) {
        return;
      }

      sanitized.push(meta);
    });

    return sanitized;
  };

  const persistFlowDefaults = async (buttons: Array<any>) => {
    if (!storedTemplate?.id) {
      return;
    }

    const sanitized = sanitizeFlowDefaults(buttons);
    if (!sanitized.length) {
      return;
    }

    const existingSerialized = JSON.stringify(storedFlowDefaults);
    const newSerialized = JSON.stringify(sanitized);
    if (existingSerialized === newSerialized) {
      return;
    }

    try {
      await prisma.whatsAppTemplate.update({
        where: { id: storedTemplate.id },
        data: {
          flowDefaults: sanitized as Prisma.InputJsonValue,
        },
      });
    } catch (persistError) {
      console.warn('[WhatsApp] Failed to persist flow defaults', {
        templateName: params.templateName,
        error: persistError instanceof Error ? persistError.message : persistError,
      });
    }
  };

  await persistFlowDefaults(effectiveButtonParams);

  const sanitizedFlowDefaultsSnapshot = sanitizeFlowDefaults(effectiveButtonParams);
  const flowDefaultsLookup = new Map<string, Record<string, any>>();
  sanitizedFlowDefaultsSnapshot.forEach((entry) => {
    const cloned = JSON.parse(JSON.stringify(entry));
    if (typeof entry.index === 'number') {
      flowDefaultsLookup.set(`index:${entry.index}`, cloned);
    }
    if (typeof entry.text === 'string' && entry.text.trim()) {
      flowDefaultsLookup.set(`text:${entry.text.trim()}`, cloned);
    }
  });

  const flowButtonDetails: Array<Record<string, any>> = [];
  effectiveButtonParams.forEach((button) => {
    if (normalizeSubType(button) !== 'FLOW') {
      return;
    }

    const actionParam = Array.isArray(button.parameters)
      ? button.parameters.find((param: any) => {
          const paramType = (param?.type || param?.TYPE || '').toString().toUpperCase();
          return paramType === 'ACTION';
        })
      : undefined;

    const actionPayload = actionParam && typeof actionParam === 'object' ? actionParam.action : undefined;
    const flowTokenRaw = actionPayload && typeof actionPayload === 'object' ? actionPayload.flow_token : undefined;
    const flowToken = typeof flowTokenRaw === 'string' ? flowTokenRaw.trim() : '';
    if (!flowToken) {
      return;
    }

    const detail: Record<string, any> = { token: flowToken };
    if (typeof button.index === 'number') {
      detail.index = button.index;
    }
    if (typeof button.text === 'string' && button.text.trim()) {
      detail.text = button.text.trim();
    }

    let defaultsMatch: Record<string, any> | undefined;
    if (typeof button.index === 'number') {
      defaultsMatch = flowDefaultsLookup.get(`index:${button.index}`);
    }
    if (!defaultsMatch && typeof button.text === 'string' && button.text.trim()) {
      defaultsMatch = flowDefaultsLookup.get(`text:${button.text.trim()}`);
    }
    if (defaultsMatch) {
      detail.defaults = defaultsMatch;
    }

    flowButtonDetails.push(detail);
  });

  const flowTokens = flowButtonDetails.map((detail) => detail.token);
  const uniqueFlowTokens = Array.from(new Set(flowTokens));
  const flowAssignmentTimestamp = uniqueFlowTokens.length ? new Date().toISOString() : undefined;
  if (flowAssignmentTimestamp) {
    flowButtonDetails.forEach((detail) => {
      if (!detail.assignedAt) {
        detail.assignedAt = flowAssignmentTimestamp;
      }
    });
  }

  console.log('[WhatsApp] sendWhatsAppTemplate called with params:', {
    to: params.to,
    templateName: params.templateName,
    languageCode: params.languageCode,
    bodyParams: params.bodyParams,
    buttonParams: effectiveButtonParams,
    headerParams: params.headerParams,
    hasComponents: !!params.components,
    componentsLength: params.components?.length,
    flowTokens: uniqueFlowTokens,
  });

  const destination = normalizeE164(params.to);
  console.log('[WhatsApp] Normalized destination:', destination);

  const componentSource =
    Array.isArray(params.components) && params.components.length ? params.components : undefined;

  const components = buildTemplateComponents(
    params.bodyParams || [],
    effectiveButtonParams,
    componentSource,
    params.headerParams
  );

  const templatePayload: any = {
    name: params.templateName,
    language: {
      code: params.languageCode || 'en_US',
    },
  };

  // Only include components if they exist (templates with variables)
  if (components && components.length > 0) {
    templatePayload.components = components;
    console.log('[WhatsApp] Added components to template payload:', components);
  } else {
    console.log('[WhatsApp] No components to add (template has no variables)');
  }

  const payload: GraphMessagePayload = {
    messaging_product: 'whatsapp',
    to: destination,
    type: 'template',
    template: templatePayload,
  };

  console.log('[WhatsApp] Final payload to send:', JSON.stringify(payload, null, 2));

  const scheduleDate = parseDateInput(params.scheduleFor);
  
  // Create a readable message preview
  const messagePreview = params.templateBody
    ? substituteTemplateVariables(params.templateBody, params.bodyParams || [])
    : templatePreview(params.templateName, components);

  const metadataWithPreview: Record<string, any> | undefined = (() => {
    if (!params.metadata && !messagePreview) {
      return undefined;
    }

    const enriched: Record<string, any> = {
      ...(params.metadata || {}),
    };

    if (!enriched.templateName) {
      enriched.templateName = params.templateName;
    }

    if (messagePreview && !enriched.textPreview) {
      enriched.textPreview = messagePreview;
    }

    if (!enriched.whatsappType) {
      enriched.whatsappType = 'template';
    }

    if (params.templateBody && !enriched.templateBody) {
      enriched.templateBody = params.templateBody;
    }

    if (params.bodyParams && enriched.bodyParams === undefined) {
      enriched.bodyParams = params.bodyParams;
    }

    if (params.buttonParams && params.buttonParams.length > 0 && enriched.buttonParams === undefined) {
      enriched.buttonParams = params.buttonParams;
    }

    if ((!params.buttonParams || params.buttonParams.length === 0) && effectiveButtonParams.length > 0) {
      enriched.buttonParams = effectiveButtonParams;
    }

    if (params.headerParams && enriched.headerParams === undefined) {
      enriched.headerParams = params.headerParams;
    }

    if (uniqueFlowTokens.length) {
      if (!enriched.flowTokens) {
        enriched.flowTokens = uniqueFlowTokens;
      }
      const latestFlowToken = uniqueFlowTokens[uniqueFlowTokens.length - 1];
      enriched.latestFlowToken = latestFlowToken;
      if (flowAssignmentTimestamp) {
        enriched.flowAssignedAt = flowAssignmentTimestamp;
      }
      if (!enriched.flowButtons && flowButtonDetails.length) {
        enriched.flowButtons = JSON.parse(JSON.stringify(flowButtonDetails));
      }
      if (!enriched.flowDefaults && sanitizedFlowDefaultsSnapshot.length) {
        enriched.flowDefaults = JSON.parse(JSON.stringify(sanitizedFlowDefaultsSnapshot));
      }
      if (!enriched.flowTemplateName) {
        enriched.flowTemplateName = params.templateName;
      }
    }

    return enriched;
  })();
  
  const sessionHints: SessionUpdateInput & { contextPatch?: Record<string, any> } = {
    ...(params.sessionHints || {}),
  };

  const baseContextPatch =
    params.sessionHints?.contextPatch && typeof params.sessionHints.contextPatch === 'object'
      ? { ...params.sessionHints.contextPatch }
      : undefined;

  if (baseContextPatch) {
    sessionHints.contextPatch = baseContextPatch;
  }

  sessionHints.phoneNumber = destination;

  if (uniqueFlowTokens.length) {
    const existingTokens = Array.isArray((sessionHints.contextPatch as any)?.flowTokens)
      ? (sessionHints.contextPatch as any).flowTokens.filter((value: any) => typeof value === 'string')
      : [];
    const mergedTokens = Array.from(new Set([...existingTokens, ...uniqueFlowTokens]));
    const latestFlowToken = mergedTokens[mergedTokens.length - 1];
    const nextContextPatch: Record<string, any> = {
      ...(sessionHints.contextPatch || {}),
      flowTokens: mergedTokens,
      lastFlowToken: latestFlowToken,
      lastFlowTemplateName: params.templateName,
    };
    if (flowAssignmentTimestamp) {
      nextContextPatch.lastFlowAssignedAt = flowAssignmentTimestamp;
    }
    if (sanitizedFlowDefaultsSnapshot.length) {
      nextContextPatch.flowDefaults = JSON.parse(JSON.stringify(sanitizedFlowDefaultsSnapshot));
    }
    if (flowButtonDetails.length) {
      nextContextPatch.flowButtons = JSON.parse(JSON.stringify(flowButtonDetails));
    }
    sessionHints.contextPatch = nextContextPatch;
    if (uniqueFlowTokens.length === 1) {
      sessionHints.flowToken = uniqueFlowTokens[0];
    }
    sessionHints.lastAction = sessionHints.lastAction || 'flow:template-sent';
  }

  const session = await ensureSession(sessionHints);

  if (scheduleDate && scheduleDate.getTime() > Date.now() + 1000 && (params.saveToDb ?? true)) {
    const record = await persistOutboundMessage({
      to: destination,
      message: messagePreview,
      status: 'scheduled',
      metadata: metadataWithPreview,
      payload,
      sessionId: session?.id ?? undefined,
      automationId: params.automationId,
      scheduledAt: scheduleDate,
    });

    await recordAnalyticsEvent({
      eventType: 'message.scheduled',
      sessionId: session?.id ?? undefined,
      messageId: record.id,
      payload: {
        templateName: params.templateName,
        scheduledFor: scheduleDate.toISOString(),
      },
    });

    return {
      success: true,
      dbRecord: record,
      provider: 'meta',
      rawResponse: { scheduled: true, scheduledFor: scheduleDate.toISOString() },
    };
  }

  try {
    const response = await graphRequest<{
      messages?: Array<{ id: string }>;
      contacts?: Array<{ wa_id: string }>;
      id?: string;
    }>('messages', {
      method: 'POST',
      body: payload,
    });

    const messageSid = response?.messages?.[0]?.id || response?.id;

    let dbRecord: WhatsAppMessage | undefined;
    if (params.saveToDb !== false) {
      dbRecord = await persistOutboundMessage({
        to: destination,
        message: messagePreview, // Use the readable preview we created earlier
        status: 'sent',
        messageSid,
        metadata: metadataWithPreview,
        payload,
        sessionId: session?.id ?? undefined,
        automationId: params.automationId,
        waId: response?.contacts?.[0]?.wa_id || session?.waId,
        sentAt: new Date(),
      });
    }

    const analytics = await recordAnalyticsEvent({
      eventType: 'message.sent',
      sessionId: session?.id ?? undefined,
      messageId: dbRecord?.id ?? undefined,
      payload: {
        templateName: params.templateName,
        languageCode: params.languageCode || 'en_US',
      },
    });

    await runAutomations('message.sent', {
      session,
      message: dbRecord,
      payload: {
        templateName: params.templateName,
        languageCode: params.languageCode || 'en_US',
      },
      analyticsEventId: analytics.id,
      params,
    });

    return {
      success: true,
      messageSid,
      dbRecord,
      provider: 'meta',
      rawResponse: response,
    };
  } catch (error: any) {
    if (debugMode) {
      console.error('Error sending template message:', error);
    }

    let dbRecord: WhatsAppMessage | undefined;
    if (params.saveToDb !== false) {
      dbRecord = await persistOutboundMessage({
        to: destination,
        message: templatePreview(params.templateName, components),
        status: 'failed',
        errorMessage: error?.message || 'Unknown error',
        metadata: metadataWithPreview,
        payload,
        sessionId: session?.id ?? undefined,
        automationId: params.automationId,
      });

      await recordAnalyticsEvent({
        eventType: 'message.failed',
        sessionId: session?.id ?? undefined,
        messageId: dbRecord.id,
        payload: {
          templateName: params.templateName,
          error: error?.message,
        },
      });
    }

    await runAutomations('message.failed', {
      session,
      message: dbRecord,
      payload: { templateName: params.templateName },
      error: error?.message,
      params,
    });

    return {
      success: false,
      error: error?.message || 'Unknown error',
      provider: 'meta',
      dbRecord,
    };
  }
}

export async function getWhatsAppMessages(
  limit: number = 50,
  options: { sessionId?: string; status?: string; includeSession?: boolean } = {}
): Promise<Array<WhatsAppMessage & { session?: WhatsAppSession | null }>> {
  return prisma.whatsAppMessage.findMany({
    where: {
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      ...(options.status ? { status: options.status } : {}),
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: options.includeSession ? { session: true } : undefined,
  });
}

export async function updateMessageStatus(
  messageSid: string,
  status: string,
  metadata?: Record<string, any>
) {
  try {
    const result = await prisma.whatsAppMessage.updateMany({
      where: { messageSid },
      data: {
        status,
        updatedAt: new Date(),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
      },
    });

    const message = await prisma.whatsAppMessage.findFirst({ where: { messageSid } });
    if (message) {
      await recordAnalyticsEvent({
        eventType: 'message.status',
        sessionId: message.sessionId ?? undefined,
        messageId: message.id,
        payload: { status, metadata },
      });

      const session = message.sessionId
        ? await prisma.whatsAppSession.findUnique({ where: { id: message.sessionId } })
        : null;
      await runAutomations('message.status', {
        session,
        message,
        payload: { status },
      });
    }

    return result;
  } catch (error) {
    console.error('Error updating message status:', error);
    return null;
  }
}

export async function markWhatsAppMessageAsRead(messageId: string) {
  await graphRequest('messages', {
    method: 'POST',
    body: {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
  });

  const message = await prisma.whatsAppMessage.findFirst({ where: { messageSid: messageId } });
  if (message) {
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: 'read',
        updatedAt: new Date(),
      },
    });

    await recordAnalyticsEvent({
      eventType: 'message.read',
      sessionId: message.sessionId ?? undefined,
      messageId: message.id,
    });

    const session = message.sessionId
      ? await prisma.whatsAppSession.findUnique({ where: { id: message.sessionId } })
      : null;
    await runAutomations('message.read', {
      session,
      message,
    });
  }
}

export async function getWhatsAppSessions(
  limit: number = 25,
  options: { includeAnalytics?: boolean; activeOnly?: boolean } = {}
) {
  return prisma.whatsAppSession.findMany({
    where: options.activeOnly ? { isArchived: false } : undefined,
    take: limit,
    orderBy: { lastInteraction: 'desc' },
    include: options.includeAnalytics
      ? {
          analytics: {
            orderBy: { observedAt: 'desc' },
            take: 10,
          },
        }
      : undefined,
  });
}

export async function updateWhatsAppSession(
  sessionId: string,
  updates: SessionUpdateInput & { isArchived?: boolean; contextPatch?: Record<string, any> }
) {
  const existing = await prisma.whatsAppSession.findUnique({ where: { id: sessionId } });
  if (!existing) {
    throw new Error('Session not found');
  }

  const context = mergeContext(existing.context, updates.contextPatch);
  const expiresAt = updates.expiresAt ? parseDateInput(updates.expiresAt) : existing.expiresAt;

  return prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: {
      phoneNumber: updates.phoneNumber ? normalizeE164(updates.phoneNumber) : existing.phoneNumber,
      waId: updates.waId ?? existing.waId,
      flowToken: updates.flowToken ?? existing.flowToken,
      context: (context || existing.context) || undefined,
      lastScreen: updates.lastScreen ?? existing.lastScreen,
      lastAction: updates.lastAction ?? existing.lastAction,
      lastMessageId: updates.lastMessageId ?? existing.lastMessageId,
      expiresAt,
      isArchived:
        typeof updates.isArchived === 'boolean' ? updates.isArchived : existing.isArchived,
    },
  });
}

export async function emitWhatsAppEvent(
  eventType: string,
  payload: {
    sessionId?: string;
    messageId?: string;
    automationId?: string;
    context?: Record<string, any>;
    raw?: Record<string, any>;
  }
) {
  const session = payload.sessionId
    ? await prisma.whatsAppSession.findUnique({ where: { id: payload.sessionId } })
    : null;
  const message = payload.messageId
    ? await prisma.whatsAppMessage.findUnique({ where: { id: payload.messageId } })
    : null;

  const analytics = await recordAnalyticsEvent({
    eventType,
    sessionId: session?.id ?? undefined,
    messageId: message?.id ?? undefined,
    automationId: payload.automationId,
    payload: payload.context || payload.raw,
  });

  await runAutomations(eventType, {
    session,
    message,
    payload: payload.context || payload.raw,
    analyticsEventId: analytics.id,
  });

  return analytics;
}

export interface UploadWhatsAppMediaParams {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
  fileName?: string;
}

export async function uploadWhatsAppMedia(params: UploadWhatsAppMediaParams) {
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    type: params.type,
    url: params.url,
  };
  if (params.caption) {
    payload.caption = params.caption;
  }
  if (params.fileName && params.type === 'document') {
    payload.filename = params.fileName;
  }
  return graphRequest<{ id: string }>('media', {
    method: 'POST',
    body: payload,
  });
}

export async function getWhatsAppMediaMetadata(mediaId: string) {
  if (!META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing Meta WhatsApp credentials');
  }

  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${mediaId}`);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    },
  });

  const payload = await response.json();
  if (!response.ok || payload?.error) {
    const errorMessage =
      payload?.error?.message ||
      payload?.error?.error_data?.details ||
      `Meta API request failed (${response.status})`;
    throw new GraphApiError(response.status, errorMessage, payload);
  }
  return payload;
}

export async function listWhatsAppTemplates(limit = 25, after?: string) {
  return graphBusinessRequest<{ data: any[]; paging?: any }>('message_templates', {
    method: 'GET',
    searchParams: {
      limit,
      after,
      fields: 'name,language,status,category,components,last_updated_time',
    },
  });
}

export async function syncWhatsAppTemplates(limit = 25) {
  if (!META_WHATSAPP_BUSINESS_ID) {
    throw new Error(
      'Meta WhatsApp Business ID missing. Set META_WHATSAPP_BUSINESS_ACCOUNT_ID or META_WHATSAPP_BUSINESS_ID.'
    );
  }

  let cursor: string | undefined;
  const synced: string[] = [];

  do {
    const response = await listWhatsAppTemplates(limit, cursor);
    const templates = response.data || [];

    for (const template of templates) {
      const bodyComponent = (template.components || []).find(
        (component: any) => component.type === 'BODY'
      );
      const bodyText = bodyComponent?.text || template.body || '';
      const variables = extractTemplateVariables(bodyText);
      const normalizedComponents = Array.isArray(template.components)
        ? template.components.map((component: any) => ({ ...component }))
        : undefined;

      await prisma.whatsAppTemplate.upsert({
        where: { name: template.name },
        update: {
          body: bodyText,
          components: normalizedComponents ? (normalizedComponents as Prisma.InputJsonValue) : Prisma.JsonNull,
          variables: variables.length ? (variables as Prisma.InputJsonValue) : undefined,
          updatedAt: new Date(),
        },
        create: {
          name: template.name,
          body: bodyText,
          components: normalizedComponents ? (normalizedComponents as Prisma.InputJsonValue) : Prisma.JsonNull,
          variables: variables.length ? (variables as Prisma.InputJsonValue) : undefined,
        },
      });

      synced.push(template.name);
    }

    cursor = response.paging?.cursors?.after;
  } while (cursor);

  return { synced };
}

export async function exchangeTokenForLongLived(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!META_APP_ID || !META_APP_SECRET) {
    console.error('META_APP_ID and META_APP_SECRET are required for token exchange');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`;
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = await response.json();

    if (data.access_token) {
      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in || 5184000,
      };
    }

    console.error('Token exchange failed:', data);
    return null;
  } catch (error) {
    console.error('Error exchanging token:', error);
    return null;
  }
}

export function verifyWebhookSignature(mode: string, token: string, challenge: string): string | null {
  if (!META_WEBHOOK_VERIFY_TOKEN) {
    console.error('META_WEBHOOK_VERIFY_TOKEN is required for webhook verification');
    return null;
  }

  if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
    return challenge;
  }

  return null;
}

export function getMetaConfigStatus() {
  return {
    hasPhoneNumberId: !!META_WHATSAPP_PHONE_NUMBER_ID,
    hasAccessToken: !!META_WHATSAPP_ACCESS_TOKEN,
    // Indicate whether a WhatsApp Business Account id was provided (prefer BUSINESS_ACCOUNT_ID var)
    hasBusinessAccountId: !!process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID,
    hasBusinessId: !!META_WHATSAPP_BUSINESS_ID,
    hasAppId: !!META_APP_ID,
    hasAppSecret: !!META_APP_SECRET,
    hasWebhookToken: !!META_WEBHOOK_VERIFY_TOKEN,
    apiVersion: META_GRAPH_API_VERSION,
    isFullyConfigured: !!(
      META_WHATSAPP_PHONE_NUMBER_ID && META_WHATSAPP_ACCESS_TOKEN
    ),
    hasProductionAuth: !!(META_APP_ID && META_APP_SECRET),
  };
}
