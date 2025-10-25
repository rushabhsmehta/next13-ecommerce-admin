# WhatsApp Flow Builder - Debug Instructions

## Current Status
✅ Dev server running at http://localhost:3000
✅ Debug logging enabled (WHATSAPP_DEBUG=1)
✅ Updated Graph API helpers with flow-specific request handler

## Steps to Capture Debug Logs

### 1. Open Flow Builder
Navigate to: http://localhost:3000/whatsapp/flows

### 2. Test Flow List (Verify Business-Level Endpoint)
Click "Sync from Meta" or "Refresh" button
- **Expected endpoint**: `https://graph.facebook.com/v22.0/{BUSINESS_ID}/flows`
- **Look for in terminal**: `[URL]:` log showing the full URL
- **Expected result**: Should list flows owned by your WABA

### 3. Test Flow Preview (Flow-Level Endpoint)
Click "Preview" button on any existing flow
- **Expected endpoint**: `https://graph.facebook.com/v22.0/{FLOW_ID}?fields=preview`
- **Look for in terminal**: 
  - `========== WhatsApp Flow API Request ==========`
  - Full URL, method, endpoint details
- **Expected result**: Preview URL or error with details

### 4. Test Flow JSON Load (Assets Endpoint)
Click "Open designer" on any flow
- **Expected endpoint**: `https://graph.facebook.com/v22.0/{FLOW_ID}/assets?fields=name,asset_type,download_url,asset_content`
- **Look for in terminal**:
  - Request logs showing the assets call
  - Response payload showing asset objects
- **Expected result**: Flow JSON loaded into editor

### 5. Capture Full Terminal Output
Copy all terminal output that appears after performing steps 2-4, including:
- Request URLs
- Status codes
- Error payloads (if any)
- Full response objects

## What to Look For

### Success Indicators ✅
- Status 200 responses
- Flow objects with `id`, `name`, `status` fields
- Preview objects with `preview_url` and `expires_at`
- Assets with `asset_type: "FLOW_JSON"` and either `asset_content` or `download_url`

### Error Indicators ❌
- **"Unknown path components"** - Wrong endpoint formation
- **401/403 errors** - Token permission issues
- **HTML response instead of JSON** - Download URL requires auth or is expired
- **404 on flow ID** - Flow doesn't exist in this WABA

## Common Issues & Fixes

### Issue 1: "Unknown path components: /{FLOW_ID}"
**Cause**: Flow ID doesn't exist in the WABA tied to your access token
**Fix**: 
1. Run `GET https://graph.facebook.com/v22.0/{BUSINESS_ID}/flows?access_token={TOKEN}` via curl
2. Use only flow IDs returned in that list
3. Or create a new flow via the "Start new flow" wizard

### Issue 2: Assets returning HTML
**Cause**: `download_url` requires authentication or is expired
**Fix**: We now prefer `asset_content` (inline) over `download_url`. If both fail, the asset may need to be re-uploaded.

### Issue 3: Preview not available
**Cause**: Flow must be published before preview is generated
**Fix**: Click "Publish" on the flow first, then try preview again

## Direct API Test Commands

### Test Flow List
```powershell
curl "https://graph.facebook.com/v22.0/1163477029017210/flows?access_token=$env:META_WHATSAPP_ACCESS_TOKEN"
```

### Test Get Flow by ID (replace FLOW_ID)
```powershell
curl "https://graph.facebook.com/v22.0/FLOW_ID?fields=id,name,status,preview&access_token=$env:META_WHATSAPP_ACCESS_TOKEN"
```

### Test Get Flow Assets (replace FLOW_ID)
```powershell
curl "https://graph.facebook.com/v22.0/FLOW_ID/assets?fields=name,asset_type,download_url,asset_content&access_token=$env:META_WHATSAPP_ACCESS_TOKEN"
```

## Next Steps After Log Capture

1. Share the terminal output here
2. I'll analyze the exact error/response
3. We'll implement the specific fix needed:
   - Token permissions adjustment
   - Asset fetching method change
   - URL construction fix
   - Flow creation if none exist

## Meta Graph API Documentation References

- **Flows API**: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi
- **Flow Object**: https://developers.facebook.com/docs/whatsapp/flows/reference/flowobject
- **Assets**: https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourfirstflow#step-4--upload-flow-json

---

**Current Environment**:
- Business Account ID: 1163477029017210
- Phone Number ID: 864613140059617
- Graph API Version: v22.0
- Debug Mode: ENABLED ✅
