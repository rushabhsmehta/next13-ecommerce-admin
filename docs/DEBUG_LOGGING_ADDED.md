# Debug Logging Enhancement

## Overview
Added comprehensive debug logging throughout the WhatsApp message sending flow to help diagnose Meta API errors.

## Changes Made

### 1. Enhanced `graphRequest` Function (src/lib/whatsapp.ts)

#### Request Logging
```
========== WhatsApp API Request ==========
[URL]: https://graph.facebook.com/v22.0/...
[Method]: POST
[Endpoint]: messages
[Request Body]: {
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "tour_package_flow",
    "language": {
      "code": "en"
    }
  }
}
==========================================
```

#### Response Logging
```
========== WhatsApp API Response ==========
[Status]: 400
[OK]: false
[Response Body]: {
  "error": {
    "message": "...",
    "code": 131009,
    ...
  }
}
===========================================
```

#### Error Logging
```
========== WhatsApp API ERROR ==========
[Endpoint]: messages
[Method]: POST
[Status]: 400
[Error Code]: 131009
[Error Subcode]: ...
[Error Message]: Parameter value is not valid
[Full Error]: { ... }
[Request Body]: { ... }
[Full Response]: { ... }
========================================
```

### 2. Enhanced `buildTemplateComponents` Function

```
[buildTemplateComponents] Called with: {
  bodyParams: [],
  bodyParamsLength: 0,
  buttonParams: [],
  buttonParamsLength: 0,
  hasComponents: false,
  componentsLength: undefined
}

[buildTemplateComponents] Output: {
  builtLength: 0,
  built: [],
  result: undefined,
  willReturnUndefined: true
}
```

### 3. Enhanced `sendWhatsAppTemplate` Function

```
[sendWhatsAppTemplate] Called with params: {
  to: '+919978783238',
  templateName: 'tour_package_flow',
  languageCode: 'en',
  bodyParams: [],
  buttonParams: [],
  hasComponents: false,
  componentsLength: undefined
}

[WhatsApp] Normalized destination: +919978783238

[WhatsApp] No components to add (template has no variables)

[WhatsApp] Final payload to send: {
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "tour_package_flow",
    "language": {
      "code": "en"
    }
  }
}
```

### 4. Enhanced API Route (src/app/api/whatsapp/send-template/route.ts)

#### Request Logging
```
========== Send Template API Called ==========
[Request Body]: {
  "to": "+919978783238",
  "templateName": "tour_package_flow",
  "languageCode": "en"
}
==============================================
```

#### Parameters Logging
```
[send-template] Parsed parameters: {
  bodyParams: [],
  buttonParams: [],
  resolvedTemplateName: 'tour_package_flow',
  resolvedLanguageCode: 'en'
}
```

#### Error Logging
```
========== Send Template Error ==========
[Error Message]: Parameter value is not valid
[Error Code]: 131009
[Error Status]: 400
[Error Response]: { ... }
[Full Error]: { ... }
=========================================
```

## What to Look For

When you send a test message now, you'll see:

1. **API Route receives the request** - What parameters were sent
2. **Template components are built** - What's being constructed
3. **Final payload** - Exact JSON being sent to Meta
4. **Meta API request** - Full request details
5. **Meta API response** - Complete response from Meta
6. **Any errors** - Detailed error information with codes and messages

## How to Use

1. **Check your terminal/console** where the Next.js app is running
2. Click "Send Message" in the UI
3. **Look for the logs** in this order:
   - `========== Send Template API Called ==========`
   - `[buildTemplateComponents] Called with:`
   - `[sendWhatsAppTemplate] Called with params:`
   - `========== WhatsApp API Request ==========`
   - `========== WhatsApp API Response ==========`
   - If error: `========== WhatsApp API ERROR ==========`

## Expected Output for Template Without Variables

```
========== Send Template API Called ==========
[Request Body]: {"to":"+919978783238","templateName":"tour_package_flow","languageCode":"en"}
==============================================

[buildTemplateComponents] Called with: {
  bodyParams: [],
  bodyParamsLength: 0,
  buttonParams: [],
  buttonParamsLength: 0,
  hasComponents: false,
  componentsLength: undefined
}

[buildTemplateComponents] Output: {
  builtLength: 0,
  built: [],
  result: undefined,
  willReturnUndefined: true
}

[WhatsApp] No components to add (template has no variables)

========== WhatsApp API Request ==========
[URL]: https://graph.facebook.com/v22.0/.../messages
[Method]: POST
[Endpoint]: messages
[Request Body]: {
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "tour_package_flow",
    "language": {
      "code": "en"
    }
  }
}
==========================================
```

## Next Steps

1. **Try sending the message again**
2. **Copy ALL the logs** from your terminal
3. **Share them** so we can see exactly what Meta is rejecting
4. Look specifically for the `[Error Code]` and `[Full Error]` in the logs

---
**Date:** October 7, 2025
**Status:** ✅ Debug logging implemented
