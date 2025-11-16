# WhatsApp Template Creation - Complete Guide

## 🎯 Issue Fixed: Media Header Example Requirement

### Problem
WhatsApp API was rejecting template creation with error:
```
Missing sample parameter for title type
Templates with IMAGE header type need an example/sample
```

### Root Cause
When creating templates with media headers (IMAGE, VIDEO, DOCUMENT), WhatsApp requires an **example URL** in a specific format:
```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": ["https://example.com/sample.jpg"]
  }
}
```

### Solution Implemented

#### 1. **UI Component Update** (`TemplateBuilder.tsx`)
- ✅ Added `example` field to `TemplateComponent` interface
- ✅ Added validation for media header examples
- ✅ Added input field for example URL when IMAGE/VIDEO/DOCUMENT format is selected
- ✅ URL validation before submission

```tsx
// New field in component
{component.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format || '') && (
  <div className="space-y-2">
    <Label>Example {component.format} URL *</Label>
    <Input
      type="url"
      placeholder={`https://example.com/sample-${component.format?.toLowerCase()}.jpg`}
      value={component.example || ''}
      onChange={(e) => updateComponent(idx, { example: e.target.value })}
    />
  </div>
)}
```

#### 2. **Backend Transformation** (`whatsapp-templates.ts`)
- ✅ Transforms simple string URL to WhatsApp's required format
- ✅ Automatically wraps URL in `header_handle` array

```typescript
if (typeof component.example === 'string') {
  return {
    ...component,
    example: {
      header_handle: [component.example]
    }
  };
}
```

#### 3. **API Validation** (`create/route.ts`)
- ✅ Validates media headers have example URLs
- ✅ Provides clear error messages

---

## 📋 Complete Template Component Reference

### Header Component

#### 1. **TEXT Header**
```json
{
  "type": "HEADER",
  "format": "TEXT",
  "text": "Order #{{1}}",
  "example": {
    "header_text": ["12345"]
  }
}
```

**UI Usage:**
- Select Format: TEXT
- Enter text with variables: `Order #{{1}}`
- System handles example automatically if variables exist

#### 2. **IMAGE Header** ⭐ Fixed
```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": ["https://example.com/product.jpg"]
  }
}
```

**UI Usage:**
1. Select Format: IMAGE
2. Enter example URL: `https://example.com/product.jpg`
3. System transforms to correct format automatically

**Supported formats:**
- JPG/JPEG
- PNG
- HTTPS URLs only
- Max 5MB

#### 3. **VIDEO Header** ⭐ Fixed
```json
{
  "type": "HEADER",
  "format": "VIDEO",
  "example": {
    "header_handle": ["https://example.com/promo.mp4"]
  }
}
```

**UI Usage:**
- Select Format: VIDEO
- Enter example URL: `https://example.com/promo.mp4`

**Supported formats:**
- MP4
- 3GPP
- Max 16MB

#### 4. **DOCUMENT Header** ⭐ Fixed
```json
{
  "type": "HEADER",
  "format": "DOCUMENT",
  "example": {
    "header_handle": ["4::aW9...meta_media_handle..."]
  }
}
```

**UI Usage:**
- Select Format: DOCUMENT
- Upload PDF ≤ 100MB (auto-generates public URL + WhatsApp media handle)
- Confirm the media handle auto-fills the "WhatsApp media handle" input

**Supported formats:**
- PDF only (UI enforces)
- Max 100MB (Meta Cloud API limit)
- Auto-uploaded to Cloudflare R2 + Meta media endpoint

#### 5. **LOCATION Header**
```json
{
  "type": "HEADER",
  "format": "LOCATION"
}
```

**Note:** Location headers don't require examples

---

### Body Component (REQUIRED)

```json
{
  "type": "BODY",
  "text": "Hello {{1}}! Your order {{2}} has been confirmed. Total: ${{3}}",
  "example": {
    "body_text": [["John", "12345", "99.99"]]
  }
}
```

**Features:**
- ✅ Supports up to 1024 characters
- ✅ Variables: `{{1}}`, `{{2}}`, etc. (up to 100)
- ✅ Auto-extracts variables for examples
- ✅ Markdown formatting support (limited)

**UI Usage:**
- Enter text with variables
- System auto-generates example structure

---

### Footer Component (Optional)

```json
{
  "type": "FOOTER",
  "text": "Reply STOP to unsubscribe"
}
```

**Features:**
- ✅ Max 60 characters
- ❌ NO variables allowed
- ✅ Plain text only

---

### Buttons Component

#### 1. **Quick Reply Buttons**
```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "QUICK_REPLY",
      "text": "Yes, confirm"
    },
    {
      "type": "QUICK_REPLY",
      "text": "No, cancel"
    }
  ]
}
```

**Limits:**
- Max 3 quick reply buttons
- Max 25 characters per button
- No URLs or phone numbers

#### 2. **Call-to-Action Buttons**

**URL Button:**
```json
{
  "type": "URL",
  "text": "View Order",
  "url": "https://example.com/order/{{1}}",
  "example": ["12345"]
}
```

**Phone Button:**
```json
{
  "type": "PHONE_NUMBER",
  "text": "Call Us",
  "phone_number": "+1234567890"
}
```

#### 3. **Flow Button** ⭐ Advanced
```json
{
  "type": "FLOW",
  "text": "Book Appointment",
  "flow_id": "1234567890",
  "flow_action": "navigate",
  "navigate_screen": "BOOKING_SCREEN"
}
```

#### 4. **Copy Code Button** (OTP)
```json
{
  "type": "COPY_CODE",
  "text": "Copy Code",
  "example": "123456"
}
```

**Limits:**
- Max 1 URL button OR 2 quick reply buttons
- Max 1 phone button
- Cannot mix URL and phone buttons

---

## 🎨 Complete Template Examples

### 1. Simple Text Template
```json
{
  "name": "welcome_message",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Welcome to our service! We're excited to have you."
    }
  ]
}
```

### 2. Template with Image Header ⭐ NEW
```json
{
  "name": "product_announcement",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE",
      "example": {
        "header_handle": ["https://example.com/product.jpg"]
      }
    },
    {
      "type": "BODY",
      "text": "Check out our new {{1}}! Limited time offer: {{2}}% off",
      "example": {
        "body_text": [["Premium Plan", "20"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Offer expires soon"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Shop Now",
          "url": "https://example.com/shop"
        }
      ]
    }
  ]
}
```

### 3. Order Confirmation with Variables
```json
{
  "name": "order_confirmation",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Order #{{1}}",
      "example": {
        "header_text": ["12345"]
      }
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, your order has been confirmed!\n\nItems: {{2}}\nTotal: ${{3}}\n\nEstimated delivery: {{4}}",
      "example": {
        "body_text": [["John Doe", "3 items", "99.99", "Oct 15, 2025"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Thank you for your purchase!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Track Order"
        },
        {
          "type": "URL",
          "text": "View Details",
          "url": "https://example.com/order/{{1}}",
          "example": ["12345"]
        }
      ]
    }
  ]
}
```

### 4. Video Tutorial Template
```json
{
  "name": "tutorial_video",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "VIDEO",
      "example": {
        "header_handle": ["https://example.com/tutorial.mp4"]
      }
    },
    {
      "type": "BODY",
      "text": "Learn how to use {{1}} in just 2 minutes!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "Next Lesson"
        }
      ]
    }
  ]
}
```

### 5. Invoice Document Template
```json
{
  "name": "monthly_invoice",
  "language": "en_US",
  "category": "UTILITY",
  "components": [
    {
      "type": "HEADER",
      "format": "DOCUMENT",
      "example": {
        "header_handle": ["https://example.com/invoice.pdf"]
      }
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, your monthly invoice for {{2}} is attached.\n\nAmount due: ${{3}}\nDue date: {{4}}",
      "example": {
        "body_text": [["John", "October 2025", "150.00", "Oct 15, 2025"]]
      }
    }
  ]
}
```

---

## 🚀 Usage Flow

### Creating a Template via UI

1. **Navigate to WhatsApp Management**
   - Dashboard → Communication → WhatsApp Management
   - Click "Create Template" tab

2. **Basic Information**
   - Enter template name (lowercase, underscores, numbers only)
   - Select language (e.g., en_US, es_ES)
   - Choose category (MARKETING, UTILITY, AUTHENTICATION)

3. **Add Components**
   - Click "Add Header" for optional header
     - For TEXT: Enter text with variables
     - For IMAGE/VIDEO/DOCUMENT: **MUST provide example URL**
   - Body is added by default (REQUIRED)
   - Click "Add Footer" for optional footer
   - Click "Add Buttons" for optional buttons

4. **Preview & Submit**
   - Click "Preview" to see template
   - Click "Create Template"
   - Template goes to Meta for approval (usually 24-48 hours)

### Creating via API

```bash
POST /api/whatsapp/templates/create

{
  "name": "template_name",
  "language": "en_US",
  "category": "UTILITY",
  "components": [...]
}
```

---

## ✅ Validation Rules

### Template Name
- ✅ Lowercase only
- ✅ Numbers allowed
- ✅ Underscores allowed
- ❌ Spaces not allowed
- ❌ Special characters not allowed
- ✅ Max 512 characters

### Headers
- ✅ Optional (except BODY which is required)
- ✅ TEXT: Can have variables with examples
- ✅ IMAGE/VIDEO/DOCUMENT: **MUST have example URL**
- ✅ Only one header per template

### Body
- ✅ REQUIRED in every template
- ✅ 1-1024 characters
- ✅ Variables supported ({{1}}, {{2}}, etc.)
- ✅ Max 100 variables

### Footer
- ✅ Optional
- ✅ Max 60 characters
- ❌ NO variables allowed

### Buttons
- ✅ Max 10 buttons total
- ✅ Max 3 quick reply buttons
- ✅ Max 2 call-to-action buttons (1 URL + 1 Phone)
- ❌ Cannot mix URL and Phone buttons

---

## 🐛 Common Errors & Solutions

### ❌ "Missing sample parameter for title type"
**Cause:** Media header (IMAGE/VIDEO) missing sample URL or document header missing Meta media handle

**Solution:**
```typescript
// ✅ Correct
{
  "type": "HEADER",
  "format": "DOCUMENT",
  "example": {
    "header_handle": ["4::aW9...meta_media_handle..."]
  }
}

// ❌ Wrong
{
  "type": "HEADER",
  "format": "DOCUMENT"
  // Missing Meta media handle!
}
```

### ❌ "Invalid parameter"
**Cause:** Usually component format issues

**Solution:** Validate all components match WhatsApp specs

### ❌ "Template name must be unique"
**Cause:** Template with same name already exists

**Solution:** Delete old template or use different name

---

## 🔄 Transformation Flow

```
User Input (UI)
    ↓
{
  format: "IMAGE",
  example: "https://example.com/image.jpg"  // Simple string
}
    ↓
Backend Transformation (whatsapp-templates.ts)
    ↓
{
  format: "IMAGE",
  example: {
    header_handle: ["https://example.com/image.jpg"]  // Proper format
  }
}
    ↓
WhatsApp API
    ↓
✅ Template Created Successfully
```

---

## 📚 Additional Resources

- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Template Components Reference](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components)
- [Template Guidelines](https://www.facebook.com/business/help/2055875911147364)

---

## 🎉 Summary of Implementation

✅ **UI Enhanced**
- Added example URL input for media headers
- Visual indicators for required fields
- Real-time validation

✅ **Backend Robust**
- Automatic format transformation
- Comprehensive validation
- Clear error messages

✅ **API Complete**
- Full CRUD operations
- Template listing with filters
- Quality score tracking
- Analytics integration

✅ **All Component Types Supported**
- TEXT, IMAGE, VIDEO, DOCUMENT, LOCATION headers
- Body with unlimited variables
- Footer
- All 8 button types
- Flow integration

---

**Last Updated:** October 10, 2025
**Status:** ✅ Fully Functional - All template types working
