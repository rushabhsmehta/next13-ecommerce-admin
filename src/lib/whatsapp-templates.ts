/**
 * WhatsApp Template Management System
 * 
 * Complete implementation for managing WhatsApp message templates including:
 * - Template CRUD operations
 * - Component builders (header, body, footer, buttons)
 * - Flow integration
 * - Template validation and preview
 * - Dynamic parameter handling
 * 
 * @see https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 */

import { graphBusinessRequest } from './whatsapp';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED' | 'DELETED';
export type ParameterFormat = 'named' | 'positional';
export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
export type ButtonType = 
  | 'QUICK_REPLY' 
  | 'PHONE_NUMBER' 
  | 'URL' 
  | 'COPY_CODE' 
  | 'FLOW'
  | 'OTP'
  | 'MPM'
  | 'SPM';

/**
 * Template Component Types
 */
export interface BaseComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
}

export interface TextHeaderComponent extends BaseComponent {
  type: 'HEADER';
  format: 'TEXT';
  text: string;
  example?: {
    header_text?: string[];
    header_text_named_params?: Array<{
      param_name: string;
      example: string;
    }>;
  };
}

export interface MediaHeaderComponent extends BaseComponent {
  type: 'HEADER';
  format: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  example: {
    header_handle: string[];
  };
}

export interface LocationHeaderComponent extends BaseComponent {
  type: 'HEADER';
  format: 'LOCATION';
}

export type HeaderComponent = 
  | TextHeaderComponent 
  | MediaHeaderComponent 
  | LocationHeaderComponent;

export interface BodyComponent extends BaseComponent {
  type: 'BODY';
  text: string;
  example?: {
    body_text?: string[][];
    body_text_named_params?: Array<{
      param_name: string;
      example: string;
    }>;
  };
}

export interface FooterComponent extends BaseComponent {
  type: 'FOOTER';
  text: string;
}

export interface QuickReplyButton {
  type: 'QUICK_REPLY';
  text: string;
}

export interface PhoneNumberButton {
  type: 'PHONE_NUMBER';
  text: string;
  phone_number: string;
}

export interface UrlButton {
  type: 'URL';
  text: string;
  url: string;
  example?: string[];
}

export interface CopyCodeButton {
  type: 'COPY_CODE';
  example: string;
}

export interface FlowButton {
  type: 'FLOW';
  text: string;
  flow_id?: string;
  flow_name?: string;
  flow_json?: any;
  flow_action?: 'navigate' | 'data_exchange';
  navigate_screen?: string;
  icon?: 'PROMOTION' | 'FEEDBACK' | 'SUPPORT';
}

export interface OTPButton {
  type: 'OTP';
  otp_type: 'COPY_CODE' | 'ONE_TAP';
  text: string;
  autofill_text?: string;
  package_name?: string;
  signature_hash?: string;
}

export type Button = 
  | QuickReplyButton 
  | PhoneNumberButton 
  | UrlButton 
  | CopyCodeButton 
  | FlowButton 
  | OTPButton;

export interface ButtonsComponent extends BaseComponent {
  type: 'BUTTONS';
  buttons: Button[];
}

export type TemplateComponent = 
  | HeaderComponent 
  | BodyComponent 
  | FooterComponent 
  | ButtonsComponent;

/**
 * Template Creation Request
 */
export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: TemplateCategory;
  parameter_format?: ParameterFormat;
  components: TemplateComponent[];
  allow_category_change?: boolean;
}

/**
 * Template from Meta API
 */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  category: TemplateCategory;
  components: TemplateComponent[];
  rejected_reason?: string;
  quality_score?: {
    score: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    date: number;
  };
  previous_category?: TemplateCategory;
  last_updated_time?: number;
}

/**
 * Template Send Parameters
 */
export interface TemplateSendParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'video' | 'document' | 'location';
  text?: string;
  parameter_name?: string; // For named parameters
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link?: string;
    id?: string;
  };
  video?: {
    link?: string;
    id?: string;
  };
  document?: {
    link?: string;
    id?: string;
    filename?: string;
  };
  location?: {
    latitude: string;
    longitude: string;
    name?: string;
    address?: string;
  };
}

export interface TemplateSendComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url' | 'flow';
  index?: number;
  parameters: TemplateSendParameter[];
}

// ============================================================================
// TEMPLATE CRUD OPERATIONS
// ============================================================================

/**
 * List all templates for the business account
 */
export async function listTemplates(options: {
  limit?: number;
  after?: string;
  fields?: string[];
  status?: TemplateStatus;
  category?: TemplateCategory;
  language?: string;
} = {}): Promise<{
  data: WhatsAppTemplate[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}> {
  const {
    limit = 100,
    after,
    fields = [
      'id',
      'name',
      'language',
      'status',
      'category',
      'components',
      'rejected_reason',
      'quality_score',
      'last_updated_time'
    ],
    status,
    category,
    language,
  } = options;

  const searchParams: any = {
    limit,
    fields: fields.join(','),
  };

  if (after) searchParams.after = after;
  if (status) searchParams.status = status;
  if (category) searchParams.category = category;
  if (language) searchParams.language = language;

  return graphBusinessRequest<{
    data: WhatsAppTemplate[];
    paging?: any;
  }>('message_templates', {
    method: 'GET',
    searchParams,
  });
}

/**
 * Get all templates (handles pagination automatically)
 */
export async function getAllTemplates(options: {
  status?: TemplateStatus;
  category?: TemplateCategory;
  language?: string;
} = {}): Promise<WhatsAppTemplate[]> {
  const allTemplates: WhatsAppTemplate[] = [];
  let after: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await listTemplates({
      ...options,
      limit: 100,
      after,
    });

    allTemplates.push(...response.data);

    if (response.paging?.cursors?.after && response.paging.next) {
      after = response.paging.cursors.after;
    } else {
      hasMore = false;
    }
  }

  return allTemplates;
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(templateId: string): Promise<WhatsAppTemplate> {
  return graphBusinessRequest<WhatsAppTemplate>(`${templateId}`, {
    method: 'GET',
    searchParams: {
      fields: 'id,name,language,status,category,components,rejected_reason,quality_score,last_updated_time',
    },
  });
}

/**
 * Create a new template
 */
export async function createTemplate(
  request: CreateTemplateRequest
): Promise<{
  id: string;
  status: TemplateStatus;
  category: TemplateCategory;
}> {
  // Transform components to ensure proper example format for media headers
  const transformedComponents = request.components.map((component: any) => {
    if (component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || '')) {
      // If example is a simple string URL, transform it to the required format
      if (typeof component.example === 'string') {
        return {
          ...component,
          example: {
            header_handle: [component.example]
          }
        };
      }
    }
    return component;
  });

  const transformedRequest = {
    ...request,
    components: transformedComponents
  };

  return graphBusinessRequest<{
    id: string;
    status: TemplateStatus;
    category: TemplateCategory;
  }>('message_templates', {
    method: 'POST',
    body: transformedRequest,
  });
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  templateNameOrId: string,
  hsm_id?: string
): Promise<{ success: boolean }> {
  const params: any = {};
  
  // If hsm_id is provided, use it as the template ID parameter
  if (hsm_id) {
    params.hsm_id = hsm_id;
  } else if (templateNameOrId) {
    params.name = templateNameOrId;
  }

  return graphBusinessRequest<{ success: boolean }>('message_templates', {
    method: 'DELETE',
    searchParams: params,
  });
}

/**
 * Edit a template (creates a new version)
 */
export async function editTemplate(
  templateId: string,
  updates: Partial<CreateTemplateRequest>
): Promise<{
  success: boolean;
}> {
  return graphBusinessRequest<{ success: boolean }>(`${templateId}`, {
    method: 'POST',
    body: updates,
  });
}

// ============================================================================
// COMPONENT BUILDERS
// ============================================================================

/**
 * Build a text header component
 */
export function buildTextHeader(
  text: string,
  parameterFormat?: ParameterFormat,
  exampleValue?: string
): TextHeaderComponent {
  const component: TextHeaderComponent = {
    type: 'HEADER',
    format: 'TEXT',
    text,
  };

  if (exampleValue) {
    if (parameterFormat === 'named') {
      // Extract named parameter from text (e.g., {{param_name}})
      const match = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
      if (match) {
        component.example = {
          header_text_named_params: [{
            param_name: match[1],
            example: exampleValue,
          }],
        };
      }
    } else {
      // Positional parameter
      component.example = {
        header_text: [exampleValue],
      };
    }
  }

  return component;
}

/**
 * Build a media header component
 */
export function buildMediaHeader(
  format: 'IMAGE' | 'VIDEO' | 'DOCUMENT',
  handleOrUrl: string
): MediaHeaderComponent {
  return {
    type: 'HEADER',
    format,
    example: {
      header_handle: [handleOrUrl],
    },
  };
}

/**
 * Build a location header component
 */
export function buildLocationHeader(): LocationHeaderComponent {
  return {
    type: 'HEADER',
    format: 'LOCATION',
  };
}

/**
 * Build a body component
 */
export function buildBody(
  text: string,
  parameterFormat?: ParameterFormat,
  exampleValues?: string[] | Record<string, string>
): BodyComponent {
  const component: BodyComponent = {
    type: 'BODY',
    text,
  };

  if (exampleValues) {
    if (parameterFormat === 'named' && !Array.isArray(exampleValues)) {
      // Named parameters
      component.example = {
        body_text_named_params: Object.entries(exampleValues).map(([param_name, example]) => ({
          param_name,
          example,
        })),
      };
    } else if (Array.isArray(exampleValues)) {
      // Positional parameters
      component.example = {
        body_text: [exampleValues],
      };
    }
  }

  return component;
}

/**
 * Build a footer component
 */
export function buildFooter(text: string): FooterComponent {
  return {
    type: 'FOOTER',
    text,
  };
}

/**
 * Build quick reply button
 */
export function buildQuickReplyButton(text: string): QuickReplyButton {
  return {
    type: 'QUICK_REPLY',
    text,
  };
}

/**
 * Build phone number button
 */
export function buildPhoneButton(text: string, phoneNumber: string): PhoneNumberButton {
  return {
    type: 'PHONE_NUMBER',
    text,
    phone_number: phoneNumber,
  };
}

/**
 * Build URL button
 */
export function buildUrlButton(
  text: string,
  url: string,
  exampleValue?: string
): UrlButton {
  const button: UrlButton = {
    type: 'URL',
    text,
    url,
  };

  if (exampleValue && url.includes('{{')) {
    button.example = [exampleValue];
  }

  return button;
}

/**
 * Build copy code button
 */
export function buildCopyCodeButton(exampleCode: string): CopyCodeButton {
  return {
    type: 'COPY_CODE',
    example: exampleCode,
  };
}

/**
 * Build Flow button
 */
export function buildFlowButton(options: {
  text: string;
  flowId?: string;
  flowName?: string;
  flowJson?: any;
  flowAction?: 'navigate' | 'data_exchange';
  navigateScreen?: string;
  icon?: 'PROMOTION' | 'FEEDBACK' | 'SUPPORT';
}): FlowButton {
  const button: FlowButton = {
    type: 'FLOW',
    text: options.text,
  };

  if (options.flowId) button.flow_id = options.flowId;
  if (options.flowName) button.flow_name = options.flowName;
  if (options.flowJson) button.flow_json = options.flowJson;
  if (options.flowAction) button.flow_action = options.flowAction;
  if (options.navigateScreen) button.navigate_screen = options.navigateScreen;
  if (options.icon) button.icon = options.icon;

  return button;
}

/**
 * Build OTP button for authentication templates
 */
export function buildOTPButton(options: {
  otpType: 'COPY_CODE' | 'ONE_TAP';
  text: string;
  autofillText?: string;
  packageName?: string;
  signatureHash?: string;
}): OTPButton {
  const button: OTPButton = {
    type: 'OTP',
    otp_type: options.otpType,
    text: options.text,
  };

  if (options.autofillText) button.autofill_text = options.autofillText;
  if (options.packageName) button.package_name = options.packageName;
  if (options.signatureHash) button.signature_hash = options.signatureHash;

  return button;
}

/**
 * Build buttons component
 */
export function buildButtons(buttons: Button[]): ButtonsComponent {
  return {
    type: 'BUTTONS',
    buttons,
  };
}

// ============================================================================
// TEMPLATE PARAMETER EXTRACTION
// ============================================================================

/**
 * Extract parameter names from template text
 */
export function extractParameters(text: string): string[] {
  const matches = text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
  return Array.from(matches, m => m[1]);
}

/**
 * Extract all parameters from a template
 */
export function extractTemplateParameters(template: WhatsAppTemplate): {
  header?: string[];
  body?: string[];
  buttons?: Record<number, string[]>;
} {
  const params: any = {};

  for (const component of template.components) {
    if (component.type === 'HEADER' && 'text' in component) {
      const headerParams = extractParameters(component.text);
      if (headerParams.length > 0) {
        params.header = headerParams;
      }
    }

    if (component.type === 'BODY') {
      const bodyParams = extractParameters(component.text);
      if (bodyParams.length > 0) {
        params.body = bodyParams;
      }
    }

    if (component.type === 'BUTTONS') {
      component.buttons.forEach((button, index) => {
        if (button.type === 'URL' && button.url.includes('{{')) {
          if (!params.buttons) params.buttons = {};
          params.buttons[index] = extractParameters(button.url);
        }
      });
    }
  }

  return params;
}

/**
 * Validate template parameters against provided values
 */
export function validateTemplateParameters(
  template: WhatsAppTemplate,
  parameters: {
    header?: string | TemplateSendParameter[];
    body?: Array<string | TemplateSendParameter>;
    buttons?: Record<number, string[]>;
  }
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const requiredParams = extractTemplateParameters(template);

  // Check header parameters
  if (requiredParams.header && requiredParams.header.length > 0) {
    if (!parameters.header) {
      errors.push(`Header parameter required: ${requiredParams.header.join(', ')}`);
    }
  }

  // Check body parameters
  if (requiredParams.body && requiredParams.body.length > 0) {
    if (!parameters.body || parameters.body.length < requiredParams.body.length) {
      errors.push(
        `Body requires ${requiredParams.body.length} parameters: ${requiredParams.body.join(', ')}`
      );
    }
  }

  // Check button parameters
  if (requiredParams.buttons) {
    Object.entries(requiredParams.buttons).forEach(([index, paramNames]) => {
      if (!parameters.buttons || !parameters.buttons[parseInt(index)]) {
        errors.push(`Button ${index} requires parameters: ${paramNames.join(', ')}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// TEMPLATE PREVIEW & UTILITIES
// ============================================================================

/**
 * Generate a preview of the template with parameters substituted
 */
export function previewTemplate(
  template: WhatsAppTemplate,
  parameters?: {
    header?: string;
    body?: string[];
    buttons?: Record<number, string[]>;
  }
): string {
  let preview = '';

  for (const component of template.components) {
    if (component.type === 'HEADER' && 'text' in component) {
      let headerText = component.text;
      if (parameters?.header) {
        headerText = headerText.replace(/\{\{[^}]+\}\}/g, parameters.header);
      }
      preview += `[${headerText}]\n\n`;
    }

    if (component.type === 'BODY') {
      let bodyText = component.text;
      if (parameters?.body) {
        parameters.body.forEach((value, index) => {
          bodyText = bodyText.replace(`{{${index + 1}}}`, value);
          // Also try named parameters
          const paramMatch = bodyText.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
          if (paramMatch) {
            bodyText = bodyText.replace(paramMatch[0], value);
          }
        });
      }
      preview += `${bodyText}\n\n`;
    }

    if (component.type === 'FOOTER') {
      preview += `[${component.text}]\n\n`;
    }

    if (component.type === 'BUTTONS') {
      preview += 'Buttons:\n';
      component.buttons.forEach((button, index) => {
        let buttonText = '';
        
        if (button.type === 'QUICK_REPLY') {
          buttonText = `  [${button.text}]`;
        } else if (button.type === 'PHONE_NUMBER') {
          buttonText = `  📞 ${button.text}: ${button.phone_number}`;
        } else if (button.type === 'URL') {
          let url = button.url;
          if (parameters?.buttons?.[index]) {
            parameters.buttons[index].forEach(value => {
              url = url.replace(/\{\{[^}]+\}\}/, value);
            });
          }
          buttonText = `  🔗 ${button.text}: ${url}`;
        } else if (button.type === 'COPY_CODE') {
          buttonText = `  📋 Copy Code`;
        } else if (button.type === 'FLOW') {
          buttonText = `  ⚡ ${button.text} (Flow)`;
        }
        
        preview += `${buttonText}\n`;
      });
    }
  }

  return preview.trim();
}

/**
 * Search templates by name, category, or content
 */
export async function searchTemplates(query: {
  name?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  language?: string;
  contentSearch?: string;
}): Promise<WhatsAppTemplate[]> {
  const allTemplates = await getAllTemplates({
    category: query.category,
    status: query.status,
    language: query.language,
  });

  let filtered = allTemplates;

  if (query.name) {
    const nameQuery = query.name.toLowerCase();
    filtered = filtered.filter(t => t.name.toLowerCase().includes(nameQuery));
  }

  if (query.contentSearch) {
    const contentQuery = query.contentSearch.toLowerCase();
    filtered = filtered.filter(t => {
      const bodyComponent = t.components.find(c => c.type === 'BODY') as BodyComponent;
      return bodyComponent?.text.toLowerCase().includes(contentQuery);
    });
  }

  return filtered;
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: TemplateCategory
): Promise<WhatsAppTemplate[]> {
  return getAllTemplates({ category, status: 'APPROVED' });
}

/**
 * Get quality metrics for templates
 */
export function analyzeTemplateQuality(templates: WhatsAppTemplate[]): {
  total: number;
  byStatus: Record<TemplateStatus, number>;
  byCategory: Record<TemplateCategory, number>;
  byQuality: Record<string, number>;
  averageAge: number;
} {
  const analysis = {
    total: templates.length,
    byStatus: {} as Record<TemplateStatus, number>,
    byCategory: {} as Record<TemplateCategory, number>,
    byQuality: {
      GREEN: 0,
      YELLOW: 0,
      RED: 0,
      UNKNOWN: 0,
    },
    averageAge: 0,
  };

  let totalAge = 0;
  const now = Date.now();

  templates.forEach(template => {
    // Count by status
    analysis.byStatus[template.status] = (analysis.byStatus[template.status] || 0) + 1;

    // Count by category
    analysis.byCategory[template.category] = (analysis.byCategory[template.category] || 0) + 1;

    // Count by quality
    const quality = template.quality_score?.score || 'UNKNOWN';
    analysis.byQuality[quality]++;

    // Calculate age
    if (template.last_updated_time) {
      totalAge += now - (template.last_updated_time * 1000);
    }
  });

  if (templates.length > 0) {
    analysis.averageAge = totalAge / templates.length / (1000 * 60 * 60 * 24); // in days
  }

  return analysis;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

const whatsappTemplates = {
  // CRUD
  listTemplates,
  getAllTemplates,
  getTemplate,
  createTemplate,
  deleteTemplate,
  editTemplate,
  
  // Builders
  buildTextHeader,
  buildMediaHeader,
  buildLocationHeader,
  buildBody,
  buildFooter,
  buildQuickReplyButton,
  buildPhoneButton,
  buildUrlButton,
  buildCopyCodeButton,
  buildFlowButton,
  buildOTPButton,
  buildButtons,
  
  // Utilities
  extractParameters,
  extractTemplateParameters,
  validateTemplateParameters,
  previewTemplate,
  searchTemplates,
  getTemplatesByCategory,
  analyzeTemplateQuality,
};

export default whatsappTemplates;
