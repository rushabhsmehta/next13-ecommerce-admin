import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplate,
  previewTemplate,
  extractTemplateParameters,
  validateTemplateParameters,
  type TemplateSendParameter,
} from '@/lib/whatsapp-templates';

/**
 * GET /api/whatsapp/templates/preview
 * Preview a template with parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const templateName = searchParams.get('name');

    if (!templateId && !templateName) {
      return NextResponse.json(
        { success: false, error: 'Provide either "id" or "name" parameter' },
        { status: 400 }
      );
    }

    // Get template
    let template;
    if (templateId) {
      template = await getTemplate(templateId);
    } else {
      // Search by name
      const { searchTemplates } = await import('@/lib/whatsapp-templates');
      const results = await searchTemplates({ name: templateName! });
      if (results.length === 0) {
        return NextResponse.json(
          { success: false, error: `Template not found: ${templateName}` },
          { status: 404 }
        );
      }
      template = results[0];
    }

    // Extract parameters
    const parameters = extractTemplateParameters(template);

    // Get example values from query params
    const headerParam = searchParams.get('header');
    const bodyParams = searchParams.get('body')?.split(',') || [];
    const buttonParams: Record<number, string[]> = {};
    
    searchParams.forEach((value, key) => {
      if (key.startsWith('button')) {
        const index = parseInt(key.replace('button', ''));
        buttonParams[index] = value.split(',');
      }
    });

    // Generate preview
    const preview = previewTemplate(template, {
      header: headerParam || undefined,
      body: bodyParams.length > 0 ? bodyParams : undefined,
      buttons: Object.keys(buttonParams).length > 0 ? buttonParams : undefined,
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        language: template.language,
        status: template.status,
        category: template.category,
      },
      parameters,
      preview,
      components: template.components,
    });

  } catch (error: any) {
    console.error('Error previewing template:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to preview template',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/whatsapp/templates/preview
 * Preview template with detailed parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, templateName, parameters } = body;

    if (!templateId && !templateName) {
      return NextResponse.json(
        { success: false, error: 'Provide either templateId or templateName' },
        { status: 400 }
      );
    }

    // Get template
    let template;
    if (templateId) {
      template = await getTemplate(templateId);
    } else {
      const { searchTemplates } = await import('@/lib/whatsapp-templates');
      const results = await searchTemplates({ name: templateName });
      if (results.length === 0) {
        return NextResponse.json(
          { success: false, error: `Template not found: ${templateName}` },
          { status: 404 }
        );
      }
      template = results[0];
    }

    // Extract required parameters
    const requiredParams = extractTemplateParameters(template);

    // Validate parameters if provided
    if (parameters) {
      const validation = validateTemplateParameters(template, parameters);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid parameters',
            validation,
            required: requiredParams,
          },
          { status: 400 }
        );
      }
    }

    // Generate preview
    const preview = previewTemplate(template, parameters);

    // Build send payload structure
    const sendPayload = buildSendPayload(template, parameters);

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        language: template.language,
        status: template.status,
        category: template.category,
        quality: template.quality_score,
      },
      required: requiredParams,
      preview,
      sendPayload,
      components: template.components,
    });

  } catch (error: any) {
    console.error('Error previewing template:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to preview template',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * Build the send payload structure for a template
 */
function buildSendPayload(template: any, parameters?: any) {
  const components: any[] = [];

  // Header component
  const headerComp = template.components.find((c: any) => c.type === 'HEADER');
  if (headerComp && parameters?.header) {
    const headerParams: any = {
      type: 'header',
      parameters: [],
    };

    if (headerComp.format === 'TEXT') {
      headerParams.parameters.push({
        type: 'text',
        text: Array.isArray(parameters.header) ? parameters.header[0] : parameters.header,
      });
    } else if (headerComp.format === 'IMAGE') {
      headerParams.parameters.push({
        type: 'image',
        image: typeof parameters.header === 'string' 
          ? { link: parameters.header }
          : parameters.header,
      });
    } else if (headerComp.format === 'VIDEO') {
      headerParams.parameters.push({
        type: 'video',
        video: typeof parameters.header === 'string'
          ? { link: parameters.header }
          : parameters.header,
      });
    } else if (headerComp.format === 'DOCUMENT') {
      headerParams.parameters.push({
        type: 'document',
        document: typeof parameters.header === 'string'
          ? { link: parameters.header }
          : parameters.header,
      });
    }

    if (headerParams.parameters.length > 0) {
      components.push(headerParams);
    }
  }

  // Body component
  if (parameters?.body && Array.isArray(parameters.body)) {
    const bodyParams: any = {
      type: 'body',
      parameters: parameters.body.map((value: any) => {
        if (typeof value === 'string' || typeof value === 'number') {
          return {
            type: 'text',
            text: String(value),
          };
        }
        return value;
      }),
    };

    components.push(bodyParams);
  }

  // Button components
  if (parameters?.buttons) {
    Object.entries(parameters.buttons as Record<number, string[]>).forEach(([index, values]) => {
      components.push({
        type: 'BUTTON',
        sub_type: 'URL',
        index: parseInt(index),
        parameters: values.map(v => ({
          type: 'text',
          text: v,
        })),
      });
    });
  }

  return {
    messaging_product: 'whatsapp',
    to: '+1234567890', // Placeholder
    type: 'template',
    template: {
      name: template.name,
      language: {
        code: template.language,
      },
      components: components.length > 0 ? components : undefined,
    },
  };
}

/**
 * OPTIONS /api/whatsapp/templates/preview
 */
export async function OPTIONS() {
  return NextResponse.json({
    message: 'Template Preview API',
    methods: {
      GET: 'Simple preview with query parameters',
      POST: 'Detailed preview with validation',
    },
    GET_parameters: {
      id: 'Template ID',
      name: 'Template name (if ID not provided)',
      header: 'Header parameter value',
      body: 'Comma-separated body parameter values',
      button0: 'Button 0 parameter values',
      button1: 'Button 1 parameter values',
    },
    POST_body: {
      templateId: 'Template ID (optional if name provided)',
      templateName: 'Template name (optional if ID provided)',
      parameters: {
        header: 'Header parameter (string or object)',
        body: ['Body parameter 1', 'Body parameter 2'],
        buttons: {
          0: ['Button 0 value'],
          1: ['Button 1 value'],
        },
      },
    },
    examples: {
      GET: '/api/whatsapp/templates/preview?name=order_confirmation&header=12345&body=John,99.99',
      POST: {
        templateName: 'order_confirmation',
        parameters: {
          header: '12345',
          body: ['John Doe', '99.99'],
          buttons: {
            0: ['tracking-123'],
          },
        },
      },
    },
  });
}
