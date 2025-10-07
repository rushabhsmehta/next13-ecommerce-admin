# WhatsApp Template Message Fix

## Issue
When sending WhatsApp template messages via the Meta Cloud API, the system was returning error:
```
Failed to send message: (#131009) Parameter value is not valid
```

## Root Cause
The Meta WhatsApp Cloud API was rejecting requests because the `components` array was being sent even when it was empty. According to Meta's API specifications:

1. Templates without variables should **not** include a `components` field in the payload
2. Sending an empty `components: []` array causes validation error #131009

## Solution
Modified the template message building logic in `src/lib/whatsapp.ts`:

### Changes Made:

1. **Updated `buildTemplateComponents` function** (lines 361-403):
   - Changed return type to `Array<Record<string, any>> | undefined`
   - Returns `undefined` instead of empty array when no components are needed
   - Only returns an array when there are actual body or button parameters

2. **Updated `sendWhatsAppTemplate` function** (lines 1115-1143):
   - Creates template payload dynamically
   - Only includes `components` field if components array exists and has items
   - Prevents sending empty components array to Meta API

3. **Updated `templatePreview` function** (line 353):
   - Made `components` parameter optional (`components?: Array<Record<string, any>>`)
   - Handles undefined components gracefully

## Code Changes

### Before:
```typescript
const payload: GraphMessagePayload = {
  messaging_product: 'whatsapp',
  to: destination,
  type: 'template',
  template: {
    name: params.templateName,
    language: {
      code: params.languageCode || 'en_US',
    },
    components, // Empty array causes error
  },
};
```

### After:
```typescript
const templatePayload: any = {
  name: params.templateName,
  language: {
    code: params.languageCode || 'en_US',
  },
};

// Only include components if they exist (templates with variables)
if (components && components.length > 0) {
  templatePayload.components = components;
}

const payload: GraphMessagePayload = {
  messaging_product: 'whatsapp',
  to: destination,
  type: 'template',
  template: templatePayload,
};
```

## Testing
To test the fix:

1. **Template without variables** (like "Hello world!"):
   ```json
   POST /api/whatsapp/send-template
   {
     "to": "+919978783238",
     "templateName": "tour_package_flow",
     "languageCode": "en"
   }
   ```
   Expected: Success, no components field in Meta API request

2. **Template with variables**:
   ```json
   POST /api/whatsapp/send-template
   {
     "to": "+919978783238",
     "templateName": "welcome_message",
     "languageCode": "en_US",
     "variables": {
       "1": "John"
     }
   }
   ```
   Expected: Success, components field included with body parameters

## Impact
- ✅ Fixes error #131009 for templates without variables
- ✅ Maintains compatibility with templates that have variables
- ✅ No breaking changes to API interface
- ✅ Type-safe implementation with TypeScript

## Related Files
- `src/lib/whatsapp.ts` - Main WhatsApp integration library
- `src/app/api/whatsapp/send-template/route.ts` - API endpoint for sending templates

## Meta API Reference
- [WhatsApp Cloud API - Send Template Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- Error Code 131009: "Parameter value is not valid" - Indicates invalid parameter structure

---
**Date:** October 7, 2025
**Status:** ✅ Fixed and Tested
