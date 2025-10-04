# WhatsApp Flow Public Key Setup Guide

## Overview
WhatsApp Flows use **end-to-end encryption** for data exchange. You need to register a 2048-bit RSA public key with Meta so they can encrypt data that only your server can decrypt.

---

## ✅ What We've Done

1. **Generated RSA-2048 Key Pair** ✓
   - Private key: `flow-keys/private.pem` (kept secret, in .gitignore)
   - Public key: `flow-keys/public.pem` (to share with Meta)
   - Added `WHATSAPP_FLOW_PRIVATE_KEY` to `.env` and `.env.local`

---

## 🔑 Your Public Key

Copy this entire key (including BEGIN/END lines):

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvZq9BzUIMs3VMSSEzJ3L
C4gvRsJkKgPPXmuntZpxUsBAMUhxsFp2YZ5tEk4MGAGuWLB/llEo6sHtUga8wReq
B47PeUsN25EHfCAg6KPEOgb+xSMmLEkWdzB3REyUO5sekdsiVGv0Ye+7gAtgyx+j
AFWOv8P0t8bpXUa5QcdZKegmVqkMlfkzzN8z6IudA6YS1c5sdvicUa/+0KqXzUn6
BsZo/KcXymPIleS1i2EtQhKqQn8kFR5qymornhaKKONKlAlL4Q9kucyWqARMtg7f
Z37kX2HOvHy2WZraRiRIuCtc2hFIGyL92fXpcwyUcUqaP2pHluWKG2RIggyuIy0n
6wIDAQAB
-----END PUBLIC KEY-----
```

---

## 📋 Registration Methods

### **Method 1: UI (Recommended - Easiest)**

1. Go to: https://business.facebook.com/wa/manage/flows/
2. Open your **"Tour Package Marketing"** flow
3. Click the **"Endpoint"** tab
4. Click **"Sign public key"**
5. Paste the public key above
6. Click **"Submit"**

✅ Done! Skip to "Next Steps" below.

---

### **Method 2: API (Alternative)**

**Prerequisites:**
- Valid access token (yours expired - need to regenerate from Meta dashboard)
- Token must have `whatsapp_business_messaging` permission

**Steps:**

1. **Get a New Access Token:**
   - Go to: https://developers.facebook.com/apps/1525479681923301/whatsapp-business/wa-dev-console/
   - Click **"Get Access Token"** or regenerate System User token
   - Copy the new token

2. **Update .env file:**
   ```bash
   META_WHATSAPP_ACCESS_TOKEN=YOUR_NEW_TOKEN_HERE
   ```

3. **Run the registration script:**
   ```powershell
   cd scripts\whatsapp
   .\register-public-key.ps1
   ```

**Or use PowerShell directly:**

```powershell
$phoneNumberId = "131371496722301"
$accessToken = "YOUR_ACCESS_TOKEN"
$publicKey = Get-Content "..\..\flow-keys\public.pem" -Raw

Invoke-RestMethod -Uri "https://graph.facebook.com/v22.0/$phoneNumberId/whatsapp_business_encryption" `
    -Method Post `
    -Headers @{ 'Authorization' = "Bearer $accessToken" } `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body @{ business_public_key = $publicKey }
```

**Verify registration:**

```powershell
Invoke-RestMethod -Uri "https://graph.facebook.com/v22.0/$phoneNumberId/whatsapp_business_encryption" `
    -Method Get `
    -Headers @{ 'Authorization' = "Bearer $accessToken" }
```

Expected response:
```json
{
  "business_public_key": "-----BEGIN PUBLIC KEY-----...",
  "business_public_key_signature_status": "VALID"
}
```

---

## 🎯 Next Steps After Registration

Once the public key is registered (via UI or API):

### 1. ✅ Complete Endpoint Setup in Meta Flow Builder:

- ✅ **Set endpoint URI**: `https://yourdomain.com/api/whatsapp/flow-endpoint`
- ✅ **Add phone number**: Already done
- ✅ **Sign public key**: Just completed
- ⏳ **Connect Meta app**: Next step
- ⏳ **Health check**: Final step

### 2. 🚀 Deploy Your Endpoint:

The endpoint is already created at:
```
src/app/api/whatsapp/flow-endpoint/route.ts
```

**But it needs the decryption logic!** Update the endpoint to:

1. Decrypt incoming requests using `WHATSAPP_FLOW_PRIVATE_KEY`
2. Process the data
3. Encrypt the response

**Reference:** https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint

### 3. 📱 Test the Flow:

Once deployed and health check passes:

1. Send the flow to your WhatsApp number
2. Go through all screens
3. Verify booking data is saved to database
4. Check console logs for any errors

---

## 🔒 Security Notes

**NEVER commit these files:**
- ❌ `flow-keys/private.pem` (added to .gitignore ✓)
- ❌ `.env` with `WHATSAPP_FLOW_PRIVATE_KEY`

**For Production:**
- Use environment variables in hosting platform (Vercel, Railway, etc.)
- Rotate keys periodically
- Use System User tokens (not temporary tokens)
- Enable webhook signature verification

---

## 📚 Resources

- **Meta Flows Encryption**: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
- **Flow Endpoint Guide**: https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint
- **Graph API Reference**: https://developers.facebook.com/docs/graph-api/reference/whatsapp-business-encryption

---

## ⚠️ Current Status

- ✅ Keys generated
- ✅ Private key added to .env
- ✅ Public key ready to register
- ⏳ **Action Required**: Register public key (use Method 1 - UI)
- ⏳ **Action Required**: Get new access token (current one expired)
- ⏳ **Action Required**: Add decryption logic to endpoint

---

## 🆘 Troubleshooting

**Error: "Session has expired"**
- Solution: Generate new access token from Meta dashboard

**Error: "Invalid public key format"**
- Solution: Ensure you copy the ENTIRE key including BEGIN/END lines

**Error: "Signature status: MISMATCH"**
- Solution: Wait a few minutes, Meta needs time to propagate the key

**Error: "Health check failed"**
- Solution: Ensure endpoint is deployed and accessible publicly
- Solution: Implement decryption logic in endpoint

---

**Recommendation:** Use **Method 1 (UI)** - it's the simplest and doesn't require token management!
