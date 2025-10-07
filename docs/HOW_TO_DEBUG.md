# How to Get Full Debug Logs

## Steps:

### 1. Open Your Terminal
Make sure you can see the terminal where your Next.js app is running (the one showing the server output).

### 2. Clear Previous Logs (Optional)
You can clear the terminal to make it easier to see new logs:
```powershell
cls
```

### 3. Click "Send Message" in Your Browser
Go back to the WhatsApp Business interface and click the green "Send Message" button.

### 4. Watch the Terminal Output
You should immediately see logs like:
```
========== Send Template API Called ==========
[Request Body]: ...
==============================================

[buildTemplateComponents] Called with: ...

========== WhatsApp API Request ==========
[URL]: ...
[Method]: POST
[Request Body]: ...
==========================================

========== WhatsApp API Response ==========
[Status]: ...
[Response Body]: ...
===========================================
```

### 5. If There's an Error
You'll see:
```
========== WhatsApp API ERROR ==========
[Endpoint]: messages
[Status]: 400 (or other status)
[Error Code]: 131009 (or other code)
[Error Message]: ...
[Full Error]: ...
[Request Body]: ...
========================================

========== Send Template Error ==========
[Error Message]: ...
[Full Error]: ...
=========================================
```

### 6. Copy ALL the Logs
**Select everything** from the terminal (Ctrl+A) and copy it (Ctrl+C), or just copy the error section.

### 7. What We're Looking For

The most important information:
- **[Request Body]** - What we're sending to Meta
- **[Error Code]** - Meta's error code (e.g., 131009)
- **[Error Message]** - Meta's error message
- **[Full Error]** - Complete error object from Meta
- **template.components** - Whether this field exists in the request

## Example of What to Look For

### Good Request (no components field):
```json
{
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "tour_package_flow",
    "language": {
      "code": "en"
    }
    // ✅ NO components field - this is correct for templates without variables
  }
}
```

### Bad Request (empty components):
```json
{
  "messaging_product": "whatsapp",
  "to": "+919978783238",
  "type": "template",
  "template": {
    "name": "tour_package_flow",
    "language": {
      "code": "en"
    },
    "components": []  // ❌ This would cause error 131009
  }
}
```

## Common Error Codes

- **131009**: Parameter value is not valid (invalid component structure)
- **131026**: Message template format is incorrect
- **131047**: Re-engagement message
- **131051**: Unsupported message type
- **133000**: Template name does not exist
- **132000**: Template parameter count mismatch

---

## Ready to Test?

1. ✅ Logs are enhanced
2. ✅ Terminal is visible
3. ✅ Ready to click "Send Message"

**Click "Send Message" now and share the full terminal output!** 🚀
