# WhatsApp Flow Public Key Signing Components Guide

## Required Components for Signing Public Key

To sign and upload your public key for WhatsApp Flows, you need the following components:

### 1. **App-Level Access Token** ⭐ REQUIRED
```bash
# Your Meta App Access Token (NOT the same as WhatsApp Business API token)
# This is different from META_WHATSAPP_ACCESS_TOKEN
META_APP_ACCESS_TOKEN=your_app_access_token_here
```

**How to get:**
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your App: `1525479681923301`
3. Generate Token with scope: `whatsapp_business_management`
4. Copy the generated token

### 2. **WhatsApp Business Account ID** ✅ YOU HAVE THIS
```bash
META_WHATSAPP_BUSINESS_ACCOUNT_ID=139266579261557
```

### 3. **Public Key File** ✅ YOU HAVE THIS
Location: `flow-keys/public.pem`
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsQkWq1RCFuJd07Ldn1BX
dNMH2RMBVa5Fwf5NGsBYD3NsoVZc1fD0YAL2EXywI3hHibXcbTTp48ogep2kx6LT
...
-----END PUBLIC KEY-----
```

### 4. **API Request Components**

#### A) Endpoint URL:
```
POST https://graph.facebook.com/v22.0/{BUSINESS_ACCOUNT_ID}/whatsapp_business_encryption
```

#### B) Headers:
```
Authorization: Bearer {APP_ACCESS_TOKEN}
Content-Type: application/json
```

#### C) Request Body:
```json
{
  "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsQkWq1RCFuJd07Ldn1BX\n...\n-----END PUBLIC KEY-----",
  "public_key_id": "your-unique-key-id"
}
```

## What You're Missing:

❌ **APP ACCESS TOKEN** - This is different from your WhatsApp Business API token

## Steps to Get App Access Token:

1. **Visit Graph API Explorer:**
   https://developers.facebook.com/tools/explorer/

2. **Select Your App:**
   - App: `Aagam Travel CRM (1525479681923301)`

3. **Generate Token:**
   - Click "Generate Access Token"
   - Select permissions: `whatsapp_business_management`
   - Copy the token

4. **Add to Environment:**
   ```bash
   # Add this to your .env file
   META_APP_ACCESS_TOKEN=your_generated_token_here
   ```

## Quick Upload Script:

Once you have the App Access Token, you can use this command:

```bash
node scripts/whatsapp/upload-public-key.js
```

Or manually via curl:
```bash
curl -X POST \
  "https://graph.facebook.com/v22.0/139266579261557/whatsapp_business_encryption" \
  -H "Authorization: Bearer YOUR_APP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsQkWq1RCFuJd07Ldn1BX\ndNMH2RMBVa5Fwf5NGsBYD3NsoVZc1fD0YAL2EXywI3hHibXcbTTp48ogep2kx6LT\nvDPTKLiceVz0rp+5dAZWmiwHw6k7fFN5CVSO4LLOwOUTpFmFR8Zifyq/VJ/Mi53i\ntJEqY23dTDk2w8ydF/QXSCHoJy4GXHVqLzICX3/q8gFjCSrtAFgALZ0Iw7W9HolF\n6w/F/OvkN39XPYGd033WLDwmQxiURd9JsEDf3hduKqYfzGa1csOIZ40I7Cak4sLa\ntRgyzIjAUDphf+SDGjNzCMb/Y9YQbpIbPf0Ohz1DMk5ohqN6Nm2OGihx15mBV73H\naQIDAQAB\n-----END PUBLIC KEY-----",
    "public_key_id": "aagam-flow-key-2025"
  }'
```

## Summary:

✅ **Private Key**: Already configured and working  
✅ **Public Key**: Generated and available  
✅ **Business Account ID**: Correct  
❌ **App Access Token**: MISSING - Get this from Graph API Explorer  

Once you get the App Access Token, you can upload your public key and complete the Flow setup!