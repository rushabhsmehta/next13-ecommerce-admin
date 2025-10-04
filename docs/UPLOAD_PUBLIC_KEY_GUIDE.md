# How to Upload Public Key to Meta WhatsApp Flow

## 📋 Quick Steps

### Step 1: Find Your Flow ID

1. **Go to Meta Flow Builder**:
   - URL: https://business.facebook.com/wa/manage/flows/

2. **Open your flow**:
   - Click on "Tour Package Booking Flow" (or your flow name)

3. **Get Flow ID from URL**:
   - Look at the browser URL bar
   - It will look like: `https://business.facebook.com/wa/manage/flows/1234567890123456/...`
   - Copy the number after `/flows/` - that's your **Flow ID**

### Step 2: Upload Public Key Using Script

```bash
node scripts/whatsapp/upload-public-key.js YOUR_FLOW_ID
```

**Example**:
```bash
node scripts/whatsapp/upload-public-key.js 1234567890123456
```

### Step 3: Verify in Meta Flow Builder

1. Go back to Flow Builder
2. Click your flow → `⋯` (three dots) → **Endpoint**
3. You should see:
   - ✅ **Public key signature status: VALID**

---

## 🔄 Alternative: Manual Upload

If the script doesn't work, you can upload manually:

### Option 1: Via Flow Builder UI

1. Go to: https://business.facebook.com/wa/manage/flows/
2. Open your flow
3. Click `⋯` → **Endpoint**
4. Click **"Sign public key"**
5. Paste this public key:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsQkWq1RCFuJd07Ldn1BX
dNMH2RMBVa5Fwf5NGsBYD3NsoVZc1fD0YAL2EXywI3hHibXcbTTp48ogep2kx6LT
vDPTKLiceVz0rp+5dAZWmiwHw6k7fFN5CVSO4LLOwOUTpFmFR8Zifyq/VJ/Mi53i
tJEqY23dTDk2w8ydF/QXSCHoJy4GXHVqLzICX3/q8gFjCSrtAFgALZ0Iw7W9HolF
6w/F/OvkN39XPYGd033WLDwmQxiURd9JsEDf3hduKqYfzGa1csOIZ40I7Cak4sLa
tRgyzIjAUDphf+SDGjNzCMb/Y9YQbpIbPf0Ohz1DMk5ohqN6Nm2OGihx15mBV73H
aQIDAQAB
-----END PUBLIC KEY-----
```

6. Click **Save**

### Option 2: Via API (cURL)

```bash
curl -X POST \
  "https://graph.facebook.com/v22.0/YOUR_FLOW_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "business_public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsQkWq1RCFuJd07Ldn1BX\ndNMH2RMBVa5Fwf5NGsBYD3NsoVZc1fD0YAL2EXywI3hHibXcbTTp48ogep2kx6LT\nvDPTKLiceVz0rp+5dAZWmiwHw6k7fFN5CVSO4LLOwOUTpFmFR8Zifyq/VJ/Mi53i\ntJEqY23dTDk2w8ydF/QXSCHoJy4GXHVqLzICX3/q8gFjCSrtAFgALZ0Iw7W9HolF\n6w/F/OvkN39XPYGd033WLDwmQxiURd9JsEDf3hduKqYfzGa1csOIZ40I7Cak4sLa\ntRgyzIjAUDphf+SDGjNzCMb/Y9YQbpIbPf0Ohz1DMk5ohqN6Nm2OGihx15mBV73H\naQIDAQAB\n-----END PUBLIC KEY-----"
  }'
```

Replace:
- `YOUR_FLOW_ID` with your actual Flow ID
- `YOUR_ACCESS_TOKEN` with your `META_WHATSAPP_ACCESS_TOKEN`

---

## 🎯 Verification

After uploading, verify the key was accepted:

### Check via API:
```bash
curl -X GET \
  "https://graph.facebook.com/v22.0/YOUR_FLOW_ID?fields=business_public_key,business_public_key_signature_status" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "business_public_key": "-----BEGIN PUBLIC KEY-----...",
  "business_public_key_signature_status": "VALID",
  "id": "1234567890123456"
}
```

### Check via Flow Builder:
1. Go to Flow Builder
2. Your Flow → `⋯` → Endpoint
3. Should show: **"Public key signature status: VALID"** ✅

---

## ❌ Troubleshooting

### Error: "Invalid access token"
- Check `META_WHATSAPP_ACCESS_TOKEN` in `.env`
- Make sure it hasn't expired
- Token needs `whatsapp_business_management` permission

### Error: "Invalid Flow ID"
- Double-check the Flow ID from the URL
- Make sure you copied the full number

### Error: "Invalid public key format"
- Make sure you're using the public key from `flow-keys/public.pem`
- Don't modify the key format
- Include the BEGIN and END markers

### Key shows "INVALID" status
- Regenerate keys: `node scripts/whatsapp/generate-flow-keys-secure-node.js "NewPass"`
- Upload the new public key
- Make sure private key in `.env` matches the public key

---

## 📚 Reference

**Meta Documentation**:
- [Implementing Your Flow Endpoint](https://developers.facebook.com/docs/whatsapp/flows/guides/implementingyourflowendpoint)
- [Flows Encryption](https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption)

**Your Files**:
- Public Key: `flow-keys/public.pem`
- Private Key: `flow-keys/private.pem` (encrypted)
- Upload Script: `scripts/whatsapp/upload-public-key.js`

---

## ✅ Success Checklist

- [ ] Found Flow ID from Meta Flow Builder URL
- [ ] Ran upload script: `node scripts/whatsapp/upload-public-key.js FLOW_ID`
- [ ] Verified in Flow Builder: "Public key signature status: VALID"
- [ ] `.env` and `.env.local` have `WHATSAPP_FLOW_PRIVATE_KEY`
- [ ] `.env` and `.env.local` have `WHATSAPP_FLOW_KEY_PASSPHRASE`
- [ ] Restarted dev server
- [ ] Tested flow in WhatsApp Flow Builder

---

**Quick Command Reference**:

```bash
# Find your Flow ID first, then run:
node scripts/whatsapp/upload-public-key.js YOUR_FLOW_ID

# Verify it was uploaded:
# Go to Flow Builder > Your Flow > ... > Endpoint
# Check: "Public key signature status: VALID"
```
