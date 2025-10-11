/**
 * WhatsApp Template Examples & Quick Reference
 * 
 * Copy-paste examples for common template scenarios
 */

import {
  buildTextHeader,
  buildMediaHeader,
  buildBody,
  buildFooter,
  buildButtons,
  buildQuickReplyButton,
  buildPhoneButton,
  buildUrlButton,
  buildCopyCodeButton,
  buildFlowButton,
  createTemplate,
} from '@/lib/whatsapp-templates';

import {
  createSignUpFlow,
  createAppointmentBookingFlow,
  createSurveyFlow,
  createLeadGenerationFlow,
} from '@/lib/whatsapp-flows';

// ============================================================================
// TEMPLATE EXAMPLES
// ============================================================================

/**
 * Example 1: Simple Welcome Message
 */
export const simpleWelcomeTemplate = {
  name: 'welcome_message',
  language: 'en_US',
  category: 'UTILITY' as const,
  components: [
    {
      type: 'BODY' as const,
      text: 'Welcome to our service! We\'re excited to have you with us. 🎉',
    },
  ],
};

/**
 * Example 2: Order Confirmation with Parameters
 */
export const orderConfirmationTemplate = {
  name: 'order_confirmation',
  language: 'en_US',
  category: 'UTILITY' as const,
  parameter_format: 'positional' as const,
  components: [
    buildTextHeader('Order #{{1}}', 'positional', '12345'),
    buildBody(
      'Thank you {{1}}! Your order has been confirmed.\n\n' +
      '📦 Items: {{2}}\n' +
      '💰 Total: ${{3}}\n' +
      '📅 Expected delivery: {{4}}\n\n' +
      'We\'ll notify you when it ships!',
      'positional',
      ['John Doe', '3 items', '99.99', 'Dec 25-28']
    ),
    buildFooter('Questions? Just reply to this message'),
    buildButtons([
      buildUrlButton('Track Order', 'https://example.com/track/{{1}}', 'abc123'),
      buildPhoneButton('Call Support', '+15551234567'),
    ]),
  ],
};

/**
 * Example 3: Marketing Campaign with Image
 */
export const marketingCampaignTemplate = {
  name: 'summer_sale_2024',
  language: 'en_US',
  category: 'MARKETING' as const,
  components: [
    buildMediaHeader('IMAGE', '4::aWd8...'), // Upload media first to get handle
    buildBody(
      '☀️ SUMMER SALE ALERT!\n\n' +
      'Get {{1}}% off on ALL items!\n' +
      'Use code: {{2}}\n\n' +
      '⏰ Hurry! Sale ends {{3}}',
      'positional',
      ['50', 'SUMMER50', 'August 31']
    ),
    buildButtons([
      buildUrlButton('Shop Now', 'https://shop.example.com'),
      buildQuickReplyButton('Unsubscribe'),
    ]),
  ],
};

/**
 * Example 4: Authentication OTP
 */
export const otpTemplate = {
  name: 'verify_code',
  language: 'en_US',
  category: 'AUTHENTICATION' as const,
  components: [
    buildBody(
      'Your verification code is: {{1}}\n\n' +
      'This code expires in 10 minutes. Do not share this code with anyone.',
      'positional',
      ['123456']
    ),
    buildButtons([
      buildCopyCodeButton('123456'),
    ]),
  ],
};

/**
 * Example 5: Appointment Reminder
 */
export const appointmentReminderTemplate = {
  name: 'appointment_reminder',
  language: 'en_US',
  category: 'UTILITY' as const,
  components: [
    buildTextHeader('Appointment Reminder', undefined),
    buildBody(
      'Hi {{1}},\n\n' +
      'This is a reminder for your appointment:\n\n' +
      '📅 Date: {{2}}\n' +
      '⏰ Time: {{3}}\n' +
      '📍 Location: {{4}}\n\n' +
      'Please arrive 10 minutes early.',
      'positional',
      ['Sarah', 'December 25, 2024', '2:00 PM', '123 Main St']
    ),
    buildButtons([
      buildQuickReplyButton('Confirm'),
      buildQuickReplyButton('Reschedule'),
    ]),
  ],
};

/**
 * Example 6: Flow Integration Template
 */
export const flowIntegrationTemplate = {
  name: 'booking_flow_template',
  language: 'en_US',
  category: 'UTILITY' as const,
  components: [
    buildBody('Ready to book your appointment? Click below to get started! 📅'),
    buildButtons([
      buildFlowButton({
        text: 'Book Now',
        flowId: 'YOUR_FLOW_ID', // Replace with actual flow ID
        icon: 'PROMOTION',
      }),
    ]),
  ],
};

/**
 * Example 7: Named Parameters Template
 */
export const namedParametersTemplate = {
  name: 'account_update',
  language: 'en_US',
  category: 'UTILITY' as const,
  parameter_format: 'named' as const,
  components: [
    buildBody(
      'Hi {{first_name}},\n\n' +
      'Your account has been updated:\n\n' +
      '• Name: {{full_name}}\n' +
      '• Email: {{email}}\n' +
      '• Phone: {{phone}}\n\n' +
      'Current balance: {{balance}}',
      'named',
      {
        first_name: 'John',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        balance: '$500.00',
      }
    ),
  ],
};

/**
 * Example 8: Multi-Button Template
 */
export const multiButtonTemplate = {
  name: 'customer_support',
  language: 'en_US',
  category: 'UTILITY' as const,
  components: [
    buildBody(
      'Hi {{1}}! How can we help you today?\n\n' +
      'Choose an option below or reply with your question.',
      'positional',
      ['John']
    ),
    buildButtons([
      buildQuickReplyButton('Order Status'),
      buildQuickReplyButton('Returns'),
      buildQuickReplyButton('Billing'),
      buildPhoneButton('Call Us', '+15551234567'),
      buildUrlButton('Help Center', 'https://help.example.com'),
    ]),
  ],
};

// ============================================================================
// FLOW EXAMPLES
// ============================================================================

/**
 * Example: Sign-Up Flow
 */
export const signUpFlowExample = createSignUpFlow({
  flowName: 'customer_signup',
  fields: [
    {
      name: 'full_name',
      label: 'Full Name',
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
    {
      name: 'company',
      label: 'Company Name (Optional)',
      type: 'TextInput',
      required: false,
    },
  ],
  submitButtonText: 'Create Account',
});

/**
 * Example: Appointment Booking Flow
 */
export const appointmentFlowExample = createAppointmentBookingFlow({
  flowName: 'salon_booking',
  services: [
    { id: 'haircut', title: 'Haircut', description: '$50 - 30 minutes' },
    { id: 'color', title: 'Hair Coloring', description: '$120 - 2 hours' },
    { id: 'treatment', title: 'Hair Treatment', description: '$80 - 1 hour' },
    { id: 'styling', title: 'Styling', description: '$60 - 45 minutes' },
  ],
  dateLabel: 'Select Appointment Date',
  timeLabel: 'Select Preferred Time',
});

/**
 * Example: Survey Flow
 */
export const surveyFlowExample = createSurveyFlow({
  flowName: 'satisfaction_survey',
  questions: [
    {
      id: 'overall_satisfaction',
      question: 'How would you rate your overall experience?',
      type: 'rating',
      required: true,
    },
    {
      id: 'product_quality',
      question: 'How satisfied are you with the product quality?',
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
      id: 'improvement_area',
      question: 'What can we improve?',
      type: 'multiple_choice',
      options: [
        'Product Quality',
        'Customer Service',
        'Delivery Speed',
        'Pricing',
        'Website Experience',
        'Other',
      ],
      required: false,
    },
    {
      id: 'additional_feedback',
      question: 'Any additional feedback?',
      type: 'text',
      required: false,
    },
  ],
});

/**
 * Example: Lead Generation Flow
 */
export const leadGenFlowExample = createLeadGenerationFlow({
  flowName: 'business_inquiry',
  collectEmail: true,
  collectPhone: true,
  collectCompany: true,
  customFields: [
    {
      name: 'company_size',
      label: 'Company Size',
      type: 'dropdown',
      options: ['1-10 employees', '11-50 employees', '51-200 employees', '200+ employees'],
    },
    {
      name: 'interest',
      label: 'What are you interested in?',
      type: 'dropdown',
      options: ['Product Demo', 'Pricing Information', 'Partnership', 'Technical Support', 'Other'],
    },
    {
      name: 'timeline',
      label: 'When are you looking to get started?',
      type: 'dropdown',
      options: ['Immediately', 'Within 1 month', 'Within 3 months', 'Just exploring'],
    },
    {
      name: 'message',
      label: 'Tell us more about your needs',
      type: 'textarea',
    },
  ],
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Quick function to create a simple text template
 */
export async function createSimpleTextTemplate(
  name: string,
  bodyText: string,
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION' = 'UTILITY'
) {
  return createTemplate({
    name,
    language: 'en_US',
    category,
    components: [
      {
        type: 'BODY',
        text: bodyText,
      },
    ],
  });
}

/**
 * Quick function to create a template with quick reply buttons
 */
export async function createQuickReplyTemplate(
  name: string,
  bodyText: string,
  buttons: string[]
) {
  return createTemplate({
    name,
    language: 'en_US',
    category: 'UTILITY',
    components: [
      buildBody(bodyText),
      buildButtons(buttons.map(buildQuickReplyButton)),
    ],
  });
}

/**
 * Quick function to create a template with a URL button
 */
export async function createUrlButtonTemplate(
  name: string,
  bodyText: string,
  buttonText: string,
  url: string
) {
  return createTemplate({
    name,
    language: 'en_US',
    category: 'UTILITY',
    components: [
      buildBody(bodyText),
      buildButtons([buildUrlButton(buttonText, url)]),
    ],
  });
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// 1. Create a template programmatically
import { createTemplate } from '@/lib/whatsapp-templates';
import { orderConfirmationTemplate } from '@/lib/whatsapp-template-examples';

await createTemplate(orderConfirmationTemplate);

// 2. Send a template
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'order_confirmation',
    languageCode: 'en_US',
    variables: {
      '1': '12345',
      '2': 'John Doe',
      '3': '3 items',
      '4': '99.99',
      '5': 'Dec 25-28',
      'button0': ['track-abc123']
    }
  })
});

// 3. Create and use a flow
import { createFlow, updateFlowJSON, publishFlow } from '@/lib/whatsapp-flows';
import { signUpFlowExample } from '@/lib/whatsapp-template-examples';

const flow = await createFlow({
  name: 'customer_signup',
  categories: ['SIGN_UP']
});

await updateFlowJSON(flow.id, signUpFlowExample);
await publishFlow(flow.id);

// 4. Use helper functions
import { createSimpleTextTemplate, createQuickReplyTemplate } from '@/lib/whatsapp-template-examples';

await createSimpleTextTemplate(
  'thank_you',
  'Thank you for your purchase! We appreciate your business.'
);

await createQuickReplyTemplate(
  'feedback_request',
  'How was your experience?',
  ['Excellent', 'Good', 'Average', 'Poor']
);

*/
