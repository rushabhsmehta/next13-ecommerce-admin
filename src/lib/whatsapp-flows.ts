/**
 * WhatsApp Flows Integration
 * 
 * Complete implementation for WhatsApp Flows including:
 * - Flow template creation
 * - Flow endpoint handling
 * - Flow data exchange
 * - Flow state management
 * 
 * @see https://developers.facebook.com/docs/whatsapp/flows
 */

import { graphBusinessRequest, graphFlowRequest } from './whatsapp';
import prismadb from '@/lib/prismadb';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FlowStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED';
export type FlowCategory = 
  | 'SIGN_UP'
  | 'SIGN_IN'
  | 'APPOINTMENT_BOOKING'
  | 'LEAD_GENERATION'
  | 'CONTACT_US'
  | 'CUSTOMER_SUPPORT'
  | 'SURVEY'
  | 'OTHER';

export type FlowEndpointProtocol = 'https';

/**
 * Flow JSON Schema (simplified for type safety)
 */
export interface FlowScreen {
  id: string;
  title: string;
  terminal?: boolean;
  success?: boolean;
  data?: Record<string, any>;
  layout: {
    type: 'SingleColumnLayout';
    children: FlowComponent[];
  };
}

export interface FlowComponent {
  type: string;
  [key: string]: any;
}

export interface FlowJSON {
  version: string;
  screens: FlowScreen[];
  data_api_version?: string;
  data_channel_uri?: string;
  routing_model?: Record<string, any>;
}

/**
 * Flow Metadata
 */
export interface WhatsAppFlow {
  id: string;
  name: string;
  status: FlowStatus;
  categories: FlowCategory[];
  validation_errors?: any[];
  json_version?: string;
  data_api_version?: string;
  endpoint_uri?: string;
  preview?: {
    preview_url: string;
    expires_at: string;
  };
  whatsapp_business_account?: {
    id: string;
  };
  application?: {
    id: string;
  };
}

/**
 * Flow Creation Request
 */
export interface CreateFlowRequest {
  name: string;
  categories: FlowCategory[];
  clone_flow_id?: string;
}

/**
 * Flow Update Request
 */
export interface UpdateFlowRequest {
  name?: string;
  categories?: FlowCategory[];
  endpoint_uri?: string;
  application_id?: string;
}

/**
 * Flow Assets Upload
 */
export interface FlowAssetUploadRequest {
  name: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  asset_type: 'FLOW_ASSET';
}

export interface FlowVersionRecord {
  id: string;
  flowId: string;
  name: string;
  versionNumber: number;
  flowJson: FlowJSON;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

interface FlowAsset {
  name: string;
  asset_type: string;
  download_url?: string;
  asset_content?: string;
}

// ============================================================================
// FLOW CRUD OPERATIONS
// ============================================================================

/**
 * List all flows
 */
export async function listFlows(): Promise<{
  data: WhatsAppFlow[];
}> {
  return graphBusinessRequest<{ data: WhatsAppFlow[] }>('flows', {
    method: 'GET',
  });
}

/**
 * Get a specific flow
 */
export async function getFlow(flowId: string, fields?: string[]): Promise<WhatsAppFlow> {
  const defaultFields = [
    'id',
    'name',
    'status',
    'categories',
    'validation_errors',
    'json_version',
    'data_api_version',
    'endpoint_uri',
    'preview',
    'whatsapp_business_account',
    'application',
  ];

  return graphFlowRequest<WhatsAppFlow>(`${flowId}`, {
    method: 'GET',
    searchParams: {
      fields: (fields || defaultFields).join(','),
    },
  });
}

/**
 * Create a new flow
 */
export async function createFlow(request: CreateFlowRequest): Promise<WhatsAppFlow> {
  return graphBusinessRequest<WhatsAppFlow>('flows', {
    method: 'POST',
    body: request,
  });
}

/**
 * Update a flow
 */
export async function updateFlow(
  flowId: string,
  updates: UpdateFlowRequest
): Promise<{ success: boolean }> {
  return graphFlowRequest<{ success: boolean }>(`${flowId}`, {
    method: 'POST',
    body: updates,
  });
}

/**
 * Delete a flow
 */
export async function deleteFlow(flowId: string): Promise<{ success: boolean }> {
  return graphFlowRequest<{ success: boolean }>(`${flowId}`, {
    method: 'DELETE',
  });
}

/**
 * Publish a flow
 */
export async function publishFlow(flowId: string): Promise<{
  success: boolean;
  validation_errors?: any[];
}> {
  return graphFlowRequest<any>(`${flowId}/publish`, {
    method: 'POST',
  });
}

/**
 * Deprecate a flow
 */
export async function deprecateFlow(flowId: string): Promise<{ success: boolean }> {
  return graphFlowRequest<{ success: boolean }>(`${flowId}`, {
    method: 'POST',
    body: { status: 'DEPRECATED' },
  });
}

// ============================================================================
// FLOW JSON MANAGEMENT
// ============================================================================

/**
 * Get flow JSON
 */
export async function getFlowJSON(flowId: string): Promise<FlowJSON> {
  const response = await graphFlowRequest<{ data: FlowAsset[] }>(`${flowId}/assets`, {
    method: 'GET',
    searchParams: {
      fields: 'name,asset_type,download_url,asset_content',
    },
  });

  const asset = response.data?.find((item) => item.asset_type === 'FLOW_JSON');
  if (!asset) {
    throw new Error('Flow JSON asset not found');
  }

  if (asset.asset_content) {
    return JSON.parse(asset.asset_content) as FlowJSON;
  }

  if (asset.download_url) {
    const download = await fetch(asset.download_url);
    if (!download.ok) {
      throw new Error(`Failed to download flow JSON asset (${download.status})`);
    }
    const text = await download.text();
    try {
      return JSON.parse(text) as FlowJSON;
    } catch (err) {
      throw new Error(`Flow JSON download was not valid JSON. Response begins with: ${text.slice(0,200)}`);
    }
  }

  throw new Error('Flow JSON asset did not include content or download URL');
}

/**
 * Update flow JSON
 */
export async function updateFlowJSON(
  flowId: string,
  flowJson: FlowJSON
): Promise<{
  success: boolean;
  validation_errors?: any[];
  error?: string;
}> {
  try {
    // Use the /assets endpoint to upload flow JSON as a file
    const formData = new FormData();
    
    // Create a Blob from the JSON string and add it as a file
    const jsonBlob = new Blob([JSON.stringify(flowJson)], { type: 'application/json' });
    formData.append('file', jsonBlob, 'flow.json');
    formData.append('asset_type', 'FLOW_JSON');
    formData.append('name', 'flow.json');
    
    const result = await graphFlowRequest<any>(`${flowId}/assets`, {
      method: 'POST',
      body: formData,
    });
    
    // Check if Meta returned validation errors
    if (result.validation_errors && result.validation_errors.length > 0) {
      console.error('❌ Flow JSON validation errors:', JSON.stringify(result.validation_errors, null, 2));
      return {
        success: false,
        validation_errors: result.validation_errors,
        error: 'Flow JSON validation failed'
      };
    }
    
    return {
      success: true,
      validation_errors: result.validation_errors || []
    };
  } catch (error: any) {
    console.error('❌ Failed to update flow JSON:', error);
    
    // Extract validation errors from Graph API error response if available
    const validationErrors = error.response?.error?.error_user_msg || 
                            error.response?.error?.message ||
                            error.message;
    
    return {
      success: false,
      error: validationErrors || 'Failed to upload flow JSON',
      validation_errors: error.response?.validation_errors || []
    };
  }
}

// ============================================================================
// FLOW TEMPLATES (Pre-built Flows)
// ============================================================================

/**
 * Create a simple sign-up flow
 */
export function createSignUpFlow(options: {
  flowName: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'TextInput' | 'TextArea' | 'Dropdown' | 'DatePicker' | 'CheckboxGroup' | 'RadioButtonsGroup';
    required?: boolean;
    helperText?: string;
  }>;
  submitButtonText?: string;
}): FlowJSON {
  const formFields = options.fields.map(field => {
    const baseComponent: any = {
      type: field.type,
      name: field.name,
      label: field.label,
      required: field.required ?? false,
    };

    if (field.helperText) {
      baseComponent['helper-text'] = field.helperText;
    }

    return baseComponent;
  });

  return {
    version: '7.3',
    screens: [
      {
        id: 'SIGNUP_SCREEN',
        title: 'Sign Up',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Form',
              name: 'signup_form',
              children: [
                ...formFields,
                {
                  type: 'Footer',
                  label: options.submitButtonText || 'Submit',
                  'on-click-action': {
                    name: 'complete',
                    payload: {
                      screen: 'SIGNUP_SCREEN',
                    },
                  },
                },
              ],
            },
          ],
        },
        terminal: true,
        success: true,
      },
    ],
  };
}

/**
 * Create an appointment booking flow
 */
export function createAppointmentBookingFlow(options: {
  flowName: string;
  services: Array<{ id: string; title: string; description?: string }>;
  dateLabel?: string;
  timeLabel?: string;
}): FlowJSON {
  return {
    version: '7.3',
    screens: [
      {
        id: 'SERVICE_SELECTION',
        title: 'Select Service',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'RadioButtonsGroup',
              name: 'selected_service',
              label: 'Choose a service',
              required: true,
              'data-source': options.services.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
              })),
            },
            {
              type: 'Footer',
              label: 'Next',
              'on-click-action': {
                name: 'navigate',
                next: {
                  type: 'screen',
                  name: 'DATE_TIME_SELECTION',
                },
                payload: {},
              },
            },
          ],
        },
      },
      {
        id: 'DATE_TIME_SELECTION',
        title: 'Select Date & Time',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'DatePicker',
              name: 'appointment_date',
              label: options.dateLabel || 'Select Date',
              required: true,
              'min-date': new Date().toISOString().split('T')[0],
            },
            {
              type: 'Dropdown',
              name: 'appointment_time',
              label: options.timeLabel || 'Select Time',
              required: true,
              'data-source': [
                { id: '09:00', title: '9:00 AM' },
                { id: '10:00', title: '10:00 AM' },
                { id: '11:00', title: '11:00 AM' },
                { id: '14:00', title: '2:00 PM' },
                { id: '15:00', title: '3:00 PM' },
                { id: '16:00', title: '4:00 PM' },
              ],
            },
            {
              type: 'Footer',
              label: 'Book Appointment',
              'on-click-action': {
                name: 'complete',
                payload: {
                  screen: 'DATE_TIME_SELECTION',
                },
              },
            },
          ],
        },
        terminal: true,
        success: true,
      },
    ],
  };
}

/**
 * Create a survey flow
 */
export function createSurveyFlow(options: {
  flowName: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'rating' | 'multiple_choice' | 'text' | 'yes_no';
    options?: string[];
    required?: boolean;
  }>;
}): FlowJSON {
  const components = options.questions.map((q, index) => {
    let component: any;

    switch (q.type) {
      case 'rating':
        component = {
          type: 'RadioButtonsGroup',
          name: q.id,
          label: q.question,
          required: q.required ?? true,
          'data-source': [
            { id: '1', title: '⭐' },
            { id: '2', title: '⭐⭐' },
            { id: '3', title: '⭐⭐⭐' },
            { id: '4', title: '⭐⭐⭐⭐' },
            { id: '5', title: '⭐⭐⭐⭐⭐' },
          ],
        };
        break;

      case 'multiple_choice':
        component = {
          type: 'RadioButtonsGroup',
          name: q.id,
          label: q.question,
          required: q.required ?? true,
          'data-source': (q.options || []).map((opt, i) => ({
            id: `${i}`,
            title: opt,
          })),
        };
        break;

      case 'yes_no':
        component = {
          type: 'RadioButtonsGroup',
          name: q.id,
          label: q.question,
          required: q.required ?? true,
          'data-source': [
            { id: 'yes', title: 'Yes' },
            { id: 'no', title: 'No' },
          ],
        };
        break;

      case 'text':
      default:
        component = {
          type: 'TextArea',
          name: q.id,
          label: q.question,
          required: q.required ?? true,
        };
        break;
    }

    return component;
  });

  return {
    version: '7.3',
    screens: [
      {
        id: 'SURVEY_SCREEN',
        title: 'Survey',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            ...components,
            {
              type: 'Footer',
              label: 'Submit',
              'on-click-action': {
                name: 'complete',
                payload: {
                  screen: 'SURVEY_SCREEN',
                },
              },
            },
          ],
        },
        terminal: true,
        success: true,
      },
    ],
  };
}

/**
 * Create a lead generation flow
 */
export function createLeadGenerationFlow(options: {
  flowName: string;
  collectEmail?: boolean;
  collectPhone?: boolean;
  collectCompany?: boolean;
  customFields?: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'dropdown';
    options?: string[];
  }>;
}): FlowJSON {
  const fields: any[] = [
    {
      type: 'TextInput',
      name: 'full_name',
      label: 'Full Name',
      required: true,
      'input-type': 'text',
    },
  ];

  if (options.collectEmail !== false) {
    fields.push({
      type: 'TextInput',
      name: 'email',
      label: 'Email Address',
      required: true,
      'input-type': 'email',
    });
  }

  if (options.collectPhone !== false) {
    fields.push({
      type: 'TextInput',
      name: 'phone',
      label: 'Phone Number',
      required: true,
      'input-type': 'phone',
    });
  }

  if (options.collectCompany) {
    fields.push({
      type: 'TextInput',
      name: 'company',
      label: 'Company Name',
      required: false,
      'input-type': 'text',
    });
  }

  // Add custom fields
  if (options.customFields) {
    options.customFields.forEach(field => {
      if (field.type === 'dropdown') {
        fields.push({
          type: 'Dropdown',
          name: field.name,
          label: field.label,
          required: false,
          'data-source': (field.options || []).map((opt, i) => ({
            id: `${i}`,
            title: opt,
          })),
        });
      } else if (field.type === 'textarea') {
        fields.push({
          type: 'TextArea',
          name: field.name,
          label: field.label,
          required: false,
        });
      } else {
        fields.push({
          type: 'TextInput',
          name: field.name,
          label: field.label,
          required: false,
          'input-type': 'text',
        });
      }
    });
  }

  return {
    version: '7.3',
    screens: [
      {
        id: 'LEAD_FORM',
        title: 'Contact Information',
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Form',
              name: 'lead_form',
              children: [
                ...fields,
                {
                  type: 'Footer',
                  label: 'Submit',
                  'on-click-action': {
                    name: 'complete',
                    payload: {
                      screen: 'LEAD_FORM',
                    },
                  },
                },
              ],
            },
          ],
        },
        terminal: true,
        success: true,
      },
    ],
  };
}

// ============================================================================
// FLOW UTILITIES
// ============================================================================

/**
 * Validate flow JSON structure
 */
export function validateFlowJSON(flowJson: FlowJSON): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!flowJson.version) {
    errors.push('Flow version is required');
  }

  if (!flowJson.screens || !Array.isArray(flowJson.screens) || flowJson.screens.length === 0) {
    errors.push('Flow must have at least one screen');
  }

  // Validate screens
  flowJson.screens?.forEach((screen, index) => {
    if (!screen.id) {
      errors.push(`Screen ${index} missing id`);
    }

    if (!screen.layout || screen.layout.type !== 'SingleColumnLayout') {
      errors.push(`Screen ${screen.id} must have SingleColumnLayout`);
    }

    if (!screen.layout?.children || screen.layout.children.length === 0) {
      errors.push(`Screen ${screen.id} must have components`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get flow preview URL
 */
export async function getFlowPreview(flowId: string): Promise<{
  preview_url: string;
  expires_at: string;
}> {
  const flow = await getFlow(flowId, ['preview']);
  
  if (!flow.preview) {
    throw new Error('Flow preview not available. Publish the flow first.');
  }

  return flow.preview;
}

// ============================================================================
// FLOW VERSIONING
// ============================================================================

export async function saveFlowVersion(params: {
  flowId: string;
  name: string;
  flowJson: FlowJSON;
  createdBy?: string | null;
  notes?: string | null;
}): Promise<FlowVersionRecord> {
  const latest = await prismadb.whatsAppFlowVersion.findFirst({
    where: { flowId: params.flowId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  const created = await prismadb.whatsAppFlowVersion.create({
    data: {
      flowId: params.flowId,
      name: params.name,
      versionNumber,
      flowJson: params.flowJson as any,
      createdBy: params.createdBy ?? null,
      notes: params.notes ?? null,
    },
  });

  return {
    id: created.id,
    flowId: created.flowId,
    name: created.name,
    versionNumber: created.versionNumber,
    flowJson: created.flowJson as any as FlowJSON,
    createdBy: created.createdBy ?? undefined,
    notes: created.notes ?? undefined,
    createdAt: created.createdAt,
  };
}

export async function listFlowVersions(flowId: string, limit = 25): Promise<FlowVersionRecord[]> {
  const records = await prismadb.whatsAppFlowVersion.findMany({
    where: { flowId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return records.map((record) => ({
    id: record.id,
    flowId: record.flowId,
    name: record.name,
    versionNumber: record.versionNumber,
    flowJson: record.flowJson as any as FlowJSON,
    createdBy: record.createdBy ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
  }));
}

export async function getFlowVersion(versionId: string): Promise<FlowVersionRecord | null> {
  const record = await prismadb.whatsAppFlowVersion.findUnique({
    where: { id: versionId },
  });

  if (!record) return null;

  return {
    id: record.id,
    flowId: record.flowId,
    name: record.name,
    versionNumber: record.versionNumber,
    flowJson: record.flowJson as any as FlowJSON,
    createdBy: record.createdBy ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt,
  };
}

export async function deleteFlowVersion(versionId: string): Promise<{ success: boolean }> {
  await prismadb.whatsAppFlowVersion.delete({ where: { id: versionId } });
  return { success: true };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

const whatsappFlows = {
  // CRUD
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  publishFlow,
  deprecateFlow,
  
  // JSON Management
  getFlowJSON,
  updateFlowJSON,
  
  // Templates
  createSignUpFlow,
  createAppointmentBookingFlow,
  createSurveyFlow,
  createLeadGenerationFlow,
  
  // Utilities
  validateFlowJSON,
  getFlowPreview,

  // Versioning
  saveFlowVersion,
  listFlowVersions,
  getFlowVersion,
  deleteFlowVersion,
};

export default whatsappFlows;
