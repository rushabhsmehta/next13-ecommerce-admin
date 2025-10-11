# 📱 WhatsApp Templates - Complete Implementation Guide

## 🎯 Overview

This is a **comprehensive, production-ready** WhatsApp template management system with full support for:

- ✅ **All Template Types** (Marketing, Utility, Authentication)
- ✅ **All Components** (Header, Body, Footer, Buttons)
- ✅ **All Button Types** (Quick Reply, URL, Phone, Copy Code, Flow, OTP)
- ✅ **Flow Integration** (Complete WhatsApp Flows support)
- ✅ **Named & Positional Parameters**
- ✅ **Template Preview & Validation**
- ✅ **Advanced Search & Analytics**

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Template Components](#template-components)
3. [Creating Templates](#creating-templates)
4. [Sending Templates](#sending-templates)
5. [Flow Templates](#flow-templates)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## 🚀 Quick Start

### 1. List All Templates

```typescript
// Get all approved templates
const response = await fetch('/api/whatsapp/templates/manage?action=approved');
const { data } = await response.json();
```

### 2. Send a Template

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'order_confirmation',
    languageCode: 'en_US',
    variables: {
      '1': 'John Doe',
      '2': '99.99',
      'button0': ['track-123']
    }
  })
});
```

### 3. Create a Template with Flows

```typescript
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'booking_flow',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Book your appointment now!'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'FLOW',
            text: 'Book Now',
            icon: 'PROMOTION',
            flow_id: 'YOUR_FLOW_ID'
          }
        ]
      }
    ]
  })
});
```

---

## 🧩 Template Components

### Header Component

**Types:**
- **TEXT**: Header with text (supports 1 parameter)
- **IMAGE**: Image header
- **VIDEO**: Video header
- **DOCUMENT**: Document (PDF) header
- **LOCATION**: Dynamic location header

```typescript
// Text Header
{
  type: 'HEADER',
  format: 'TEXT',
  text: 'Order #{{1}}',
  example: { header_text: ['12345'] }
}

// Image Header
{
  type: 'HEADER',
  format: 'IMAGE',
  example: { header_handle: ['4::aW...'] }
}

// Location Header (filled when sending)
{
  type: 'HEADER',
  format: 'LOCATION'
}
```

### Body Component

**Required** - Main message text with support for multiple parameters.

```typescript
// Positional Parameters
{
  type: 'BODY',
  text: 'Thank you {{1}}! Your order #{{2}} total is ${{3}}.',
  example: {
    body_text: [['John Doe', '12345', '99.99']]
  }
}

// Named Parameters
{
  type: 'BODY',
  text: 'Hello {{name}}! Your balance is {{balance}}.',
  example: {
    body_text_named_params: [
      { param_name: 'name', example: 'John' },
      { param_name: 'balance', example: '$500' }
    ]
  }
}
```

### Footer Component

**Optional** - Small text at bottom (no parameters supported).

```typescript
{
  type: 'FOOTER',
  text: 'Reply STOP to unsubscribe'
}
```

### Buttons Component

**Types of Buttons:**

#### 1. Quick Reply Buttons
```typescript
{
  type: 'BUTTONS',
  buttons: [
    { type: 'QUICK_REPLY', text: 'Yes' },
    { type: 'QUICK_REPLY', text: 'No' }
  ]
}
```

#### 2. Phone Number Buttons
```typescript
{
  type: 'BUTTONS',
  buttons: [
    {
      type: 'PHONE_NUMBER',
      text: 'Call Support',
      phone_number: '+15551234567'
    }
  ]
}
```

#### 3. URL Buttons
```typescript
{
  type: 'BUTTONS',
  buttons: [
    {
      type: 'URL',
      text: 'View Order',
      url: 'https://example.com/order/{{1}}',
      example: ['order-123']
    }
  ]
}
```

#### 4. Copy Code Buttons
```typescript
{
  type: 'BUTTONS',
  buttons: [
    {
      type: 'COPY_CODE',
      example: 'PROMO25'
    }
  ]
}
```

#### 5. Flow Buttons 🔥
```typescript
{
  type: 'BUTTONS',
  buttons: [
    {
      type: 'FLOW',
      text: 'Book Appointment',
      flow_id: 'YOUR_FLOW_ID',
      icon: 'PROMOTION'
    }
  ]
}
```

#### 6. OTP Buttons (Authentication Templates)
```typescript
{
  type: 'BUTTONS',
  buttons: [
    {
      type: 'OTP',
      otp_type: 'COPY_CODE',
      text: 'Copy Code'
    }
  ]
}
```

---

## 📝 Creating Templates

### Simple Text Template

```typescript
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'welcome_message',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to our service! We\'re excited to have you.'
      }
    ]
  })
});
```

### Template with Parameters

```typescript
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'order_confirmation',
    language: 'en_US',
    category: 'UTILITY',
    parameter_format: 'positional', // or 'named'
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Order #{{1}}',
        example: { header_text: ['12345'] }
      },
      {
        type: 'BODY',
        text: 'Thank you {{1}}! Your order has been confirmed.\n\nItems: {{2}}\nTotal: ${{3}}\n\nExpected delivery: {{4}}',
        example: {
          body_text: [['John Doe', '3 items', '99.99', 'Dec 25, 2024']]
        }
      },
      {
        type: 'FOOTER',
        text: 'Questions? Reply to this message'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Track Order',
            url: 'https://example.com/track/{{1}}',
            example: ['track-abc123']
          },
          {
            type: 'PHONE_NUMBER',
            text: 'Call Support',
            phone_number: '+15551234567'
          }
        ]
      }
    ]
  })
});
```

### Marketing Template with Image

```typescript
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'summer_sale',
    language: 'en_US',
    category: 'MARKETING',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_handle: ['4::aWd8...'] // Upload media first
        }
      },
      {
        type: 'BODY',
        text: 'Summer Sale! 🌞\n\nGet {{1}}% off on all items.\nUse code: {{2}}\n\nSale ends {{3}}!',
        example: {
          body_text: [['50', 'SUMMER50', 'August 31']]
        }
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Shop Now',
            url: 'https://example.com/sale'
          },
          {
            type: 'QUICK_REPLY',
            text: 'Unsubscribe'
          }
        ]
      }
    ]
  })
});
```

---

## 📤 Sending Templates

### Basic Send

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'welcome_message',
    languageCode: 'en_US'
  })
});
```

### Send with Parameters

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'order_confirmation',
    languageCode: 'en_US',
    variables: {
      // Header parameter
      'header': '12345',
      
      // Body parameters (positional)
      '1': 'John Doe',
      '2': '3 items',
      '3': '99.99',
      '4': 'December 25, 2024',
      
      // Button parameter (URL button)
      'button0': ['track-abc123']
    }
  })
});
```

### Send with Named Parameters

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'greeting',
    languageCode: 'en_US',
    variables: {
      'first_name': 'John',
      'last_name': 'Doe',
      'account_balance': '$500.00'
    }
  })
});
```

### Send with Media Header

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'summer_sale',
    languageCode: 'en_US',
    variables: {
      // Image header
      'headerImage': 'https://example.com/sale-banner.jpg',
      
      // Body parameters
      '1': '50',
      '2': 'SUMMER50',
      '3': 'August 31'
    }
  })
});
```

### Send with Flow Button

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'booking_flow_template',
    languageCode: 'en_US',
    variables: {
      // Flow token for this session
      'flow_token': `session_${Date.now()}`,
      
      // Optional: Pre-fill flow data
      'flow_action_data': {
        customer_name: 'John Doe',
        service_type: 'haircut'
      }
    }
  })
});
```

### Schedule a Template

```typescript
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'reminder',
    languageCode: 'en_US',
    variables: {
      '1': 'John',
      '2': 'December 25 at 2:00 PM'
    },
    scheduleFor: '2024-12-24T10:00:00Z' // ISO 8601 format
  })
});
```

---

## 🌊 Flow Templates

### Create a Flow from Template

```typescript
// Create a sign-up flow
await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  body: JSON.stringify({
    type: 'signup',
    options: {
      flowName: 'customer_signup',
      fields: [
        {
          name: 'full_name',
          label: 'Full Name',
          type: 'TextInput',
          required: true
        },
        {
          name: 'email',
          label: 'Email Address',
          type: 'TextInput',
          required: true
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'TextInput',
          required: true
        }
      ],
      submitButtonText: 'Sign Up'
    },
    autoPublish: false
  })
});
```

### Create Appointment Booking Flow

```typescript
await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  body: JSON.stringify({
    type: 'appointment',
    options: {
      flowName: 'salon_booking',
      services: [
        { id: 'haircut', title: 'Haircut', description: '$50 - 30 mins' },
        { id: 'color', title: 'Hair Coloring', description: '$120 - 2 hours' },
        { id: 'treatment', title: 'Hair Treatment', description: '$80 - 1 hour' }
      ],
      dateLabel: 'Select Appointment Date',
      timeLabel: 'Select Preferred Time'
    },
    autoPublish: true
  })
});
```

### Create Survey Flow

```typescript
await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  body: JSON.stringify({
    type: 'survey',
    options: {
      flowName: 'satisfaction_survey',
      questions: [
        {
          id: 'rating',
          question: 'How would you rate our service?',
          type: 'rating',
          required: true
        },
        {
          id: 'recommend',
          question: 'Would you recommend us?',
          type: 'yes_no',
          required: true
        },
        {
          id: 'feedback',
          question: 'Any additional feedback?',
          type: 'text',
          required: false
        }
      ]
    }
  })
});
```

### Create Lead Generation Flow

```typescript
await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  body: JSON.stringify({
    type: 'lead_generation',
    options: {
      flowName: 'lead_capture',
      collectEmail: true,
      collectPhone: true,
      collectCompany: true,
      customFields: [
        {
          name: 'interest',
          label: 'What interests you?',
          type: 'dropdown',
          options: ['Product Demo', 'Pricing Info', 'Partnership', 'Other']
        },
        {
          name: 'message',
          label: 'Tell us more about your needs',
          type: 'textarea'
        }
      ]
    }
  })
});
```

---

## 📖 API Reference

### Template Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/templates/manage` | GET | List/search templates |
| `/api/whatsapp/templates/manage` | DELETE | Delete a template |
| `/api/whatsapp/templates/create` | POST | Create a template |
| `/api/whatsapp/templates/preview` | GET/POST | Preview template |

### Flow Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/flows/manage` | GET | List flows |
| `/api/whatsapp/flows/manage` | POST | Create/update/publish flow |
| `/api/whatsapp/flows/manage` | DELETE | Delete flow |
| `/api/whatsapp/flows/templates` | POST | Create flow from template |

### Sending

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/send-template` | POST | Send template message |

---

## ✅ Best Practices

### 1. Template Naming
- Use lowercase
- Use underscores (no spaces or hyphens)
- Be descriptive: `order_confirmation` not `template1`

### 2. Categories
- **MARKETING**: Promotions, announcements
- **UTILITY**: Transactions, account updates, alerts
- **AUTHENTICATION**: OTPs, verification codes

### 3. Parameters
- **Use Named Parameters** for better readability
- Keep parameter count reasonable (< 10)
- Provide clear example values

### 4. Flow Design
- Keep flows short (2-3 screens max)
- Use clear labels and helper text
- Test flows before publishing
- Handle errors gracefully

### 5. Testing
- Always test templates before sending to customers
- Use the preview API
- Test with different parameter values
- Verify on multiple devices

---

## 📊 Analytics & Monitoring

### Get Template Analytics

```typescript
const response = await fetch('/api/whatsapp/templates/manage?action=analytics');
const { analytics, templates } = await response.json();

console.log(analytics);
// {
//   total: 25,
//   byStatus: { APPROVED: 20, PENDING: 3, REJECTED: 2 },
//   byCategory: { MARKETING: 10, UTILITY: 13, AUTHENTICATION: 2 },
//   byQuality: { GREEN: 15, YELLOW: 3, RED: 1, UNKNOWN: 6 },
//   averageAge: 45.2 // days
// }
```

### Search Templates

```typescript
// Search by name
await fetch('/api/whatsapp/templates/manage?action=search&name=order');

// Search by content
await fetch('/api/whatsapp/templates/manage?action=search&content=thank you');

// Combined filters
await fetch('/api/whatsapp/templates/manage?action=search&name=promo&category=MARKETING&status=APPROVED');
```

---

## 🎨 Complete Examples

### E-commerce Order Confirmation

```typescript
// 1. Create Template
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'ecommerce_order_confirm',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Order Confirmed! 🎉'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}},\n\nYour order #{{2}} has been confirmed!\n\n📦 Items: {{3}}\n💰 Total: ${{4}}\n📅 Estimated delivery: {{5}}\n\nThank you for shopping with us!'
      },
      {
        type: 'FOOTER',
        text: 'Need help? Just reply to this message'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'URL',
            text: 'Track Order',
            url: 'https://shop.example.com/track/{{1}}',
            example: ['abc123']
          },
          {
            type: 'PHONE_NUMBER',
            text: 'Call Support',
            phone_number: '+15551234567'
          }
        ]
      }
    ]
  })
});

// 2. Send to Customer
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'ecommerce_order_confirm',
    languageCode: 'en_US',
    variables: {
      '1': 'Sarah Johnson',
      '2': 'ORD-12345',
      '3': '3 items',
      '4': '127.50',
      '5': 'Dec 28-30',
      'button0': ['ORD-12345']
    }
  })
});
```

### Restaurant Reservation with Flow

```typescript
// 1. Create Flow
const flowResponse = await fetch('/api/whatsapp/flows/templates', {
  method: 'POST',
  body: JSON.stringify({
    type: 'appointment',
    options: {
      flowName: 'restaurant_booking',
      services: [
        { id: 'lunch', title: 'Lunch Reservation' },
        { id: 'dinner', title: 'Dinner Reservation' },
        { id: 'private', title: 'Private Event' }
      ]
    },
    autoPublish: true
  })
});

const { data: { flow_id } } = await flowResponse.json();

// 2. Create Template with Flow Button
await fetch('/api/whatsapp/templates/create', {
  method: 'POST',
  body: JSON.stringify({
    name: 'restaurant_booking',
    language: 'en_US',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to {{1}}! 🍽️\n\nReady to book your table? Click below to choose your preferred date and time.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'FLOW',
            text: 'Book a Table',
            flow_id: flow_id,
            icon: 'PROMOTION'
          }
        ]
      }
    ]
  })
});

// 3. Send to Customer
await fetch('/api/whatsapp/send-template', {
  method: 'POST',
  body: JSON.stringify({
    to: '+1234567890',
    templateName: 'restaurant_booking',
    languageCode: 'en_US',
    variables: {
      '1': 'The Fine Diner',
      'flow_token': `booking_${Date.now()}`
    }
  })
});
```

---

## 🔍 Debugging

### Enable Debug Mode

```bash
# .env.local
WHATSAPP_DEBUG=1
```

### Check Template Status

```typescript
const response = await fetch('/api/whatsapp/templates/manage?action=get&id=TEMPLATE_ID');
const { data } = await response.json();

console.log('Status:', data.status);
console.log('Quality:', data.quality_score);
console.log('Rejected Reason:', data.rejected_reason);
```

### Preview Before Sending

```typescript
const response = await fetch('/api/whatsapp/templates/preview', {
  method: 'POST',
  body: JSON.stringify({
    templateName: 'order_confirmation',
    parameters: {
      body: ['John', 'ORD-123', '99.99']
    }
  })
});

const { preview } = await response.json();
console.log(preview);
```

---

## 🎓 Next Steps

1. **Review Meta Documentation**: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
2. **Test Your Templates**: Use the preview API extensively
3. **Monitor Quality**: Check template quality scores regularly
4. **Optimize**: Based on user engagement and feedback
5. **Scale**: Build automation workflows

---

## 💡 Tips

- **Start Simple**: Begin with basic text templates
- **Test Extensively**: Use preview and test sends
- **Monitor Metrics**: Track delivery and engagement
- **Follow Guidelines**: Adhere to WhatsApp policies
- **User Consent**: Always respect user preferences

---

**Need Help?** Check the inline documentation in the code or refer to Meta's official WhatsApp Business API documentation.

**Built with ❤️ for production use**
