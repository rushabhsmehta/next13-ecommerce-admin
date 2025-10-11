import { NextRequest, NextResponse } from 'next/server';
import { createTemplate, type CreateTemplateRequest } from '@/lib/whatsapp-templates';

/**
 * POST /api/whatsapp/templates/create
 * Create a new WhatsApp message template
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTemplateRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.language || !body.category || !body.components) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, language, category, components' 
        },
        { status: 400 }
      );
    }

    // Validate template name
    if (!/^[a-z0-9_]+$/.test(body.name)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Template name must contain only lowercase alphanumeric characters and underscores' 
        },
        { status: 400 }
      );
    }

    // Validate components
    if (!Array.isArray(body.components) || body.components.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'At least one component is required' 
        },
        { status: 400 }
      );
    }

    // Ensure body component exists
    const hasBody = body.components.some(c => c.type === 'BODY');
    if (!hasBody) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Template must include a BODY component' 
        },
        { status: 400 }
      );
    }

    // Validate media headers have example
    const headerComponent: any = body.components.find(c => c.type === 'HEADER');
    if (headerComponent && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format || '')) {
      if (!headerComponent.example || (typeof headerComponent.example === 'object' && !headerComponent.example.header_handle)) {
        return NextResponse.json(
          {
            success: false,
            error: `${headerComponent.format} header requires an example URL (provide in 'example' field)`
          },
          { status: 400 }
        );
      }
    }

    const result = await createTemplate(body);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Template created successfully and submitted for review',
    });

  } catch (error: any) {
    console.error('Error creating template:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create template',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/whatsapp/templates/create
 * Get documentation for creating templates
 */
export async function GET() {
  return NextResponse.json({
    message: 'Create WhatsApp Message Template',
    method: 'POST',
    documentation: 'https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates',
    body: {
      name: 'Template name (lowercase, alphanumeric, underscores only)',
      language: 'Language code (e.g., en_US, es_ES)',
      category: 'Template category (AUTHENTICATION, MARKETING, UTILITY)',
      parameter_format: 'Optional: "named" or "positional" (default: positional)',
      components: [
        {
          type: 'HEADER (optional)',
          format: 'TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION',
          text: 'Header text (if TEXT format)',
          example: 'Example values for parameters',
        },
        {
          type: 'BODY (required)',
          text: 'Body text with optional {{1}} variables',
          example: {
            body_text: [['Example value 1', 'Example value 2']],
          },
        },
        {
          type: 'FOOTER (optional)',
          text: 'Footer text (no variables)',
        },
        {
          type: 'BUTTONS (optional)',
          buttons: [
            { type: 'QUICK_REPLY | PHONE_NUMBER | URL | COPY_CODE | FLOW | OTP' },
          ],
        },
      ],
    },
    examples: {
      simple_text: {
        name: 'hello_world',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Hello! Welcome to our service.',
          },
        ],
      },
      with_parameters: {
        name: 'order_confirmation',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Order #{{1}}',
            example: { header_text: ['12345'] },
          },
          {
            type: 'BODY',
            text: 'Thank you {{1}}! Your order has been confirmed. Total: ${{2}}',
            example: { body_text: [['John Doe', '99.99']] },
          },
          {
            type: 'FOOTER',
            text: 'Reply STOP to unsubscribe',
          },
          {
            type: 'BUTTONS',
            buttons: [
              { type: 'QUICK_REPLY', text: 'Track Order' },
              { type: 'URL', text: 'View Details', url: 'https://example.com/order/{{1}}', example: ['12345'] },
            ],
          },
        ],
      },
      with_flow: {
        name: 'booking_flow',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          {
            type: 'BODY',
            text: 'Book your appointment now!',
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'FLOW',
                text: 'Book Now',
                icon: 'PROMOTION',
                flow_action: 'navigate',
                navigate_screen: 'BOOKING_SCREEN',
              },
            ],
          },
        ],
      },
    },
  });
}
