import { NextRequest, NextResponse } from 'next/server';
import {
  createSignUpFlow,
  createAppointmentBookingFlow,
  createSurveyFlow,
  createLeadGenerationFlow,
  createFlow,
  updateFlowJSON,
  publishFlow,
  validateFlowJSON,
  type FlowCategory,
} from '@/lib/whatsapp-flows';

/**
 * POST /api/whatsapp/flows/templates
 * Generate flows from templates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, options, autoPublish = false } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Template type is required' },
        { status: 400 }
      );
    }

    let flowJson;
    let flowName = options?.flowName || `${type}_flow_${Date.now()}`;
    let categories: FlowCategory[] = [];

    // Generate flow JSON based on template type
    switch (type) {
      case 'signup':
        if (!options?.fields || !Array.isArray(options.fields)) {
          return NextResponse.json(
            { success: false, error: 'Fields array is required for sign-up flow' },
            { status: 400 }
          );
        }

        flowJson = createSignUpFlow({
          flowName,
          fields: options.fields,
          submitButtonText: options.submitButtonText,
        });
        categories = ['SIGN_UP'];
        break;

      case 'appointment':
        if (!options?.services || !Array.isArray(options.services)) {
          return NextResponse.json(
            { success: false, error: 'Services array is required for appointment booking flow' },
            { status: 400 }
          );
        }

        flowJson = createAppointmentBookingFlow({
          flowName,
          services: options.services,
          dateLabel: options.dateLabel,
          timeLabel: options.timeLabel,
        });
        categories = ['APPOINTMENT_BOOKING'];
        break;

      case 'survey':
        if (!options?.questions || !Array.isArray(options.questions)) {
          return NextResponse.json(
            { success: false, error: 'Questions array is required for survey flow' },
            { status: 400 }
          );
        }

        flowJson = createSurveyFlow({
          flowName,
          questions: options.questions,
        });
        categories = ['SURVEY'];
        break;

      case 'lead_generation':
        flowJson = createLeadGenerationFlow({
          flowName,
          collectEmail: options?.collectEmail,
          collectPhone: options?.collectPhone,
          collectCompany: options?.collectCompany,
          customFields: options?.customFields,
        });
        categories = ['LEAD_GENERATION'];
        break;

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Unknown template type: ${type}`,
            available_types: ['signup', 'appointment', 'survey', 'lead_generation']
          },
          { status: 400 }
        );
    }

    // Validate flow JSON
    const validation = validateFlowJSON(flowJson);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Generated flow JSON is invalid',
          validation_errors: validation.errors,
          flow_json: flowJson,
        },
        { status: 400 }
      );
    }

    // Create the flow
    const flow = await createFlow({
      name: flowName,
      categories,
    });

    // Update with JSON
    await updateFlowJSON(flow.id, flowJson);

    // Publish if requested
    let publishResult;
    if (autoPublish) {
      publishResult = await publishFlow(flow.id);
      
      if (publishResult.validation_errors && publishResult.validation_errors.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Flow created but failed to publish',
          flow_id: flow.id,
          validation_errors: publishResult.validation_errors,
          flow_json: flowJson,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        flow_id: flow.id,
        flow_name: flowName,
        status: autoPublish ? 'PUBLISHED' : 'DRAFT',
        categories,
        flow_json: flowJson,
      },
      message: autoPublish 
        ? 'Flow created and published successfully' 
        : 'Flow created successfully. Use the publish action to make it available.',
    });

  } catch (error: any) {
    console.error('Error creating flow from template:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create flow from template',
        details: error.response?.data || error,
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/whatsapp/flows/templates
 * Get available flow templates and documentation
 */
export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Flow Templates',
    templates: {
      signup: {
        description: 'Create a sign-up flow with custom fields',
        required: ['fields'],
        example: {
          type: 'signup',
          options: {
            flowName: 'user_signup',
            fields: [
              {
                name: 'first_name',
                label: 'First Name',
                type: 'TextInput',
                required: true,
              },
              {
                name: 'email',
                label: 'Email Address',
                type: 'TextInput',
                required: true,
              },
              {
                name: 'phone',
                label: 'Phone Number',
                type: 'TextInput',
                required: true,
              },
            ],
            submitButtonText: 'Create Account',
          },
          autoPublish: false,
        },
      },
      appointment: {
        description: 'Create an appointment booking flow',
        required: ['services'],
        example: {
          type: 'appointment',
          options: {
            flowName: 'book_appointment',
            services: [
              { id: 'haircut', title: 'Haircut', description: '$50' },
              { id: 'color', title: 'Hair Color', description: '$120' },
              { id: 'treatment', title: 'Hair Treatment', description: '$80' },
            ],
            dateLabel: 'Preferred Date',
            timeLabel: 'Preferred Time',
          },
          autoPublish: false,
        },
      },
      survey: {
        description: 'Create a survey flow with custom questions',
        required: ['questions'],
        example: {
          type: 'survey',
          options: {
            flowName: 'customer_satisfaction',
            questions: [
              {
                id: 'satisfaction',
                question: 'How satisfied are you with our service?',
                type: 'rating',
                required: true,
              },
              {
                id: 'recommend',
                question: 'Would you recommend us to a friend?',
                type: 'yes_no',
                required: true,
              },
              {
                id: 'feedback',
                question: 'Any additional feedback?',
                type: 'text',
                required: false,
              },
            ],
          },
          autoPublish: false,
        },
      },
      lead_generation: {
        description: 'Create a lead generation flow',
        required: [],
        example: {
          type: 'lead_generation',
          options: {
            flowName: 'lead_capture',
            collectEmail: true,
            collectPhone: true,
            collectCompany: true,
            customFields: [
              {
                name: 'interest',
                label: 'What are you interested in?',
                type: 'dropdown',
                options: ['Product A', 'Product B', 'Services', 'Partnership'],
              },
              {
                name: 'message',
                label: 'Tell us more',
                type: 'textarea',
              },
            ],
          },
          autoPublish: false,
        },
      },
    },
    field_types: {
      TextInput: 'Single-line text input',
      TextArea: 'Multi-line text input',
      Dropdown: 'Dropdown selection',
      DatePicker: 'Date picker',
      CheckboxGroup: 'Multiple checkboxes',
      RadioButtonsGroup: 'Radio buttons (single selection)',
    },
    survey_question_types: {
      rating: '5-star rating',
      multiple_choice: 'Multiple choice with custom options',
      text: 'Free text answer',
      yes_no: 'Yes/No question',
    },
    usage: {
      method: 'POST',
      body: {
        type: 'Template type (signup, appointment, survey, lead_generation)',
        options: 'Template-specific options (see examples above)',
        autoPublish: 'Boolean - automatically publish after creation (default: false)',
      },
    },
    next_steps: [
      '1. Create flow using this endpoint',
      '2. Test the flow using the preview URL',
      '3. Publish the flow when ready',
      '4. Create a template message with a FLOW button pointing to your flow',
      '5. Send the template message to users',
    ],
  });
}
