# Flow Button Support - IMPLEMENTED ✅

## Problem Solved
Template `first_flow` has a "View Flow" button which requires special Flow button parameters. Without these parameters, Meta API returns error:
```
Error 131009: Components sub_type invalid at index: 0 and type: 0
```

## Solution Implemented

### 1. Auto-Detection for Flow Templates
The system now automatically detects templates with "flow" in their name and adds the required Flow button parameters:

```typescript
// Auto-detect Flow templates
if (templateName.includes('flow') && buttonParams.length === 0) {
  // Automatically add Flow button with generated token
  buttonParams.push({
    type: 'button',
    sub_type: 'flow',
    index: 0,
    parameters: [{
      type: 'action',
      action: {
        flow_token: `flow_${phoneNumber}_${timestamp}`,
        flow_action_data: {}
      }
    }]
  });
}
```

### 2. Manual Flow Button Parameters
You can also explicitly provide Flow parameters in the `variables` object:

```json
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en",
  "variables": {
    "flowToken": "my_custom_token",
    "flowActionData": {
      "customField": "value"
    }
  }
}
```

Or using snake_case:
```json
{
  "variables": {
    "flow_token": "my_custom_token",
    "flow_action_data": {
      "customField": "value"
    }
  }
}
```

## How It Works

### Template Type Detection
Templates are detected as Flow templates if their name contains:
- `flow` (e.g., `first_flow`, `my_flow`)
- `_flow` (e.g., `user_flow`, `booking_flow`)

### Button Component Structure
For Flow buttons, the system generates:
```json
{
  "type": "button",
  "sub_type": "flow",
  "index": 0,
  "parameters": [
    {
      "type": "action",
      "action": {
        "flow_token": "unique_token_here",
        "flow_action_data": {}
      }
    }
  ]
}
```

### Flow Token Generation
If not provided, a unique Flow token is automatically generated:
```
flow_{phoneNumber}_{timestamp}
```
Example: `flow_919978783238_1696723456789`

## Usage Examples

### Example 1: Simple Flow Template (Auto-Detection)
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en"
}
```
✅ Flow button parameters automatically added

### Example 2: Flow Template with Custom Token
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "first_flow",
  "languageCode": "en",
  "variables": {
    "flowToken": "booking_123",
    "flowActionData": {
      "bookingId": "123",
      "userId": "456"
    }
  }
}
```

### Example 3: Template with Body Variables AND Flow Button
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "welcome_flow",
  "languageCode": "en",
  "variables": {
    "1": "John",
    "2": "Doe",
    "flowToken": "user_789"
  }
}
```

## Other Button Types

### URL Buttons
```json
{
  "variables": {
    "button0": ["dynamic-slug"]
  }
}
```
Or:
```json
{
  "variables": {
    "cta_url": "product-123"
  }
}
```

### Quick Reply Buttons
Quick reply buttons usually don't need parameters and are handled automatically by Meta.

## Testing

### Test the Fix
1. Go to WhatsApp Settings in your UI
2. Select template `first_flow`
3. Enter phone number `+919978783238`
4. Click "Send Message"

**Expected Result:** ✅ Message sends successfully with Flow button

### What You'll See in Logs
```
[send-template] Detected Flow template, adding default Flow button parameters

[buildTemplateComponents] Called with: {
  buttonParams: [
    {
      type: 'button',
      sub_type: 'flow',
      index: 0,
      parameters: [...]
    }
  ],
  buttonParamsLength: 1
}

========== WhatsApp API Request ==========
[Request Body]: {
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "first_flow",
    "language": {
      "code": "en"
    },
    "components": [
      {
        "type": "button",
        "sub_type": "flow",
        "index": 0,
        "parameters": [
          {
            "type": "action",
            "action": {
              "flow_token": "flow_919978783238_...",
              "flow_action_data": {}
            }
          }
        ]
      }
    ]
  }
}
```

## Template Configuration Reference

### In Meta Business Manager
When you create a template with a Flow button:
1. Template body: "Hello"
2. Button type: "Flow"
3. Button text: "View Flow"
4. Flow: Select your WhatsApp Flow
5. No button variables needed in template definition

### When Sending
The Flow button parameters are added automatically by our system based on the template name.

---

## Status: ✅ READY TO TEST

**Try sending the `first_flow` template again!** It should now work. 🚀
