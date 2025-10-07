# Template Header Support (Image, Video, Document, Text)

## Problem
Error 132012: "header: Format mismatch, expected IMAGE, received UNKNOWN"

This error occurs when a template has a header (image, video, document, or text variable) but the header parameters are not provided when sending the message.

## Solution Implemented

### Header Parameter Support
The system now supports all WhatsApp template header types:
- **Text** - Dynamic text in header
- **Image** - Image URL in header
- **Video** - Video URL in header  
- **Document** - Document URL in header

## Usage

### Method 1: Simple Image Header (String)
```json
{
  "to": "+919978783238",
  "templateName": "template_10_07_2025",
  "languageCode": "en",
  "variables": {
    "headerImage": "https://example.com/image.jpg"
  }
}
```

Or using snake_case:
```json
{
  "variables": {
    "header_image": "https://example.com/image.jpg"
  }
}
```

### Method 2: Explicit Header Object
```json
{
  "variables": {
    "header": {
      "type": "image",
      "image": {
        "link": "https://example.com/image.jpg"
      }
    }
  }
}
```

### Method 3: Video Header
```json
{
  "variables": {
    "header": {
      "type": "video",
      "video": {
        "link": "https://example.com/video.mp4"
      }
    }
  }
}
```

### Method 4: Document Header
```json
{
  "variables": {
    "header": {
      "type": "document",
      "document": {
        "link": "https://example.com/document.pdf",
        "filename": "brochure.pdf"
      }
    }
  }
}
```

### Method 5: Text Header
```json
{
  "variables": {
    "header": {
      "type": "text",
      "text": "Hello {{name}}"
    }
  }
}
```

## Complete Example: Template with Header + Body + Button

```json
{
  "to": "+919978783238",
  "templateName": "booking_confirmation",
  "languageCode": "en",
  "variables": {
    "headerImage": "https://example.com/booking-header.jpg",
    "1": "John Doe",
    "2": "October 10, 2025",
    "button0": ["booking123"]
  }
}
```

This will send:
- **Header**: Image from URL
- **Body**: Variables {{1}} and {{2}} filled with name and date
- **Button**: URL button with dynamic parameter

## Template Structure in Meta

### For `template_10_07_2025`:
```
Header: IMAGE
Body: (your text)
Buttons: (if any)
```

When you send this template, you MUST provide the header image:
```json
{
  "headerImage": "https://your-image-url.com/image.jpg"
}
```

## Generated Component Structure

The system will generate the correct component structure for Meta:

```json
{
  "components": [
    {
      "type": "header",
      "parameters": [
        {
          "type": "image",
          "image": {
            "link": "https://example.com/image.jpg"
          }
        }
      ]
    },
    {
      "type": "body",
      "parameters": [
        {
          "type": "text",
          "text": "John Doe"
        }
      ]
    }
  ]
}
```

## Supported Header Types

| Type | Meta Field | Required Fields |
|------|-----------|----------------|
| Image | `IMAGE` | `image.link` (URL) |
| Video | `VIDEO` | `video.link` (URL) |
| Document | `DOCUMENT` | `document.link` (URL), `document.filename` (optional) |
| Text | `TEXT` | `text` (string) |

## Testing

### Test with Image Header
```bash
POST /api/whatsapp/send-template
{
  "to": "+919978783238",
  "templateName": "template_10_07_2025",
  "languageCode": "en",
  "variables": {
    "headerImage": "https://picsum.photos/800/400"
  }
}
```

### Expected Logs
```
[send-template] Parsed parameters: {
  headerParams: {
    type: 'image',
    image: { link: 'https://picsum.photos/800/400' }
  }
}

[buildTemplateComponents] Called with: {
  headerParams: {
    type: 'image',
    image: { link: 'https://picsum.photos/800/400' }
  }
}
```

### Expected Payload to Meta
```json
{
  "template": {
    "name": "template_10_07_2025",
    "language": { "code": "en" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": {
              "link": "https://picsum.photos/800/400"
            }
          }
        ]
      }
    ]
  }
}
```

## Image URL Requirements

Meta requires that image URLs:
- ✅ Use HTTPS (not HTTP)
- ✅ Be publicly accessible
- ✅ Return valid image content-type
- ✅ Be under 5MB for images
- ✅ Supported formats: JPG, PNG

### Example Valid URLs:
- `https://picsum.photos/800/400` (test images)
- `https://your-cdn.com/images/header.jpg`
- `https://your-storage.s3.amazonaws.com/image.png`

### ❌ Invalid URLs:
- `http://example.com/image.jpg` (not HTTPS)
- `file:///local/image.jpg` (local file)
- Private URLs requiring authentication

## UI Update Needed

To send templates with image headers from the UI, you need to add an input field:

```tsx
<Input
  placeholder="Header Image URL (optional)"
  value={templateVariables.headerImage || ''}
  onChange={(e) => setTemplateVariables({
    ...templateVariables,
    headerImage: e.target.value
  })}
/>
```

## Status

✅ **Header support implemented** for all types (image, video, document, text)

---

**Now try sending `template_10_07_2025` with an image URL!** 🚀
