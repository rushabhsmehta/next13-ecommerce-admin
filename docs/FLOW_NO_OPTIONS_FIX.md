# 🐛 WhatsApp Flow - No Options Showing After "View Flow" Button

## 🔍 Problem Description

**Symptoms:**
1. ✅ Template message received successfully
2. ✅ "View Flow" button clicked
3. ✅ Question appears: "Where would you like to travel?"
4. ❌ **No destination options showing** (blank screen)

---

## 🎯 Root Cause

The endpoint is **unable to decrypt** the incoming request from Meta because:

❌ **Environment variables missing on Vercel:**
- `WHATSAPP_FLOW_PRIVATE_KEY` 
- `WHATSAPP_FLOW_KEY_PASSPHRASE`

### What's Happening:

1. User clicks "View Flow" button
2. Meta sends **encrypted INIT request** to your endpoint
3. Your endpoint tries to decrypt using private key
4. **Decryption fails** because keys not found in environment
5. Endpoint returns error or empty response
6. WhatsApp shows question but no options

---

## ✅ Solution: Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard

1. Open: https://vercel.com/dashboard
2. Select project: **next13-ecommerce-admin**
3. Go to: **Settings** → **Environment Variables**

### Step 2: Add Private Key

**Variable Name:**
```
WHATSAPP_FLOW_PRIVATE_KEY
```

**Variable Value:** (Copy entire block including headers)
```
-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,FF5AA4D67AC8AB03

fHbH4kiIwXbDS1L1rISoTD3yGHchLr9f7W5tYg91SJCGhjaL31c3J+Uy3iBrajwH
X9lbfenUSIjVkM3V5YrXYrzTWZMdvLn1dRSgMRHO7s6gScFyhhpOwabw6CKuf+WO
00t8FFm4Qb7TD5/Fo0lGm/RVL0DvF+uc9xwkSlX1O6tyDiBYxx5dUKdd3DGStFGN
9vCu5M9Kdgdlfs7SuMBkt855H7tZn8vqr1+TwRpTllTBg8cDAhggkqiVjX4qvvcm
apJ/42a8VGcaf9AWypkvVnu5dNhkS4g69+O3CUgXdBTDHhE6U4j5/ix30b1Shz5O
2r9cBWDX9B5p6S7ajKpFaKpNOS5WwdgFjxrcQ7EjqxojB9KDEG/leQcdCawTPrvp
G7OzeKUZ+0uflY6IXefD5oKhBn858Z3h69i8reX1HKBP8tLu9/sTsL8sKkIigrp2
ZWalZbAsjymbFSrnC2rp0EnAVN2NNaPk7f9iQvJHM1HavJeitud7PSJgi2H9bVxE
/k9mpboWOxb8OB0HnKB93Lzl4qX57Nxl1SNwlyy3ls8A13Dk2qYe4zeMEMhef1p9
o0bDyuwMCZ2PSda9n8tRAg/EPmzScYXPtBd767S7z1CtTLf/D/4OqUZrLaQQLf9O
DlFi58UXhFMvbhjSaJwTIRve1jVphJPLO01Y8SDYBUlXcd3wldLgPHTqj4HQ6Pqc
c9arVg7fsGaelFvU4yc4r7fUFdRi1g7bDGYXEZ9JIRGGKenLpp6CpC4/2qcoSDQp
2UmKhBVpDNajGAgJpy6vKbp27irCQpY/okf9rxfQjCfB7b+YuaWUnZozhVVrWWo8
KzlIgx//ndxtdjGZxzr5h+ORXCC8JKf7Jno6XD2UiGo9ph++k78/Ajbv4fnRI7kY
Py/Mqi8r4pAbysSp58lEZGIikE1q+A/9kFKvEXxH9T8fnamd9+wYDZGGSBPpCBeY
yDyE52FmUWND6jg/VAAeKQ5pNZyHDF4DFwN/pqRt/qmD3o1/28pEgp9YxfL4tUfL
HrL2X/kPzDzOWbr4NR4jWeV3KOjRsVx8YbMpYQ40GEYn32uUFKnK88tQTNBbtyUi
1TCq9Hd6NGKkxYadvaxbyBteyabsjyGMsjvwnnGBkqk9ZoWO64gOioyeJwEciGxk
QTTYtHcOgoqyOTT3F/wIOJC34PoKLtTlBoukpjEcIt3IJA2N302De2eBH9OHd9Vu
BnoZLH1l9sHPCf1NkaIJkoioizl2GRaq/8L9NqByl9Wr7+ZIbPximcqx52kLptZb
ZwYtvuvE/T1A4LOkqohSBqmwiy1k9J/3V6dB2m9EmG7syTdd0pzF5NpTfntZQ3u1
ulc3lMl/VnfSRux9m3+dI3ANf3bMI4twG+3nDAjW/2O0OWFiQVjLcU0w14ZGKlfQ
2drioexVdiqmxDv5hmXR2bt5Y7NnlQOAAayBXfApA/G/nldyOCnoWAKYnWhZAe17
qQxSr4MpMuvJ0hOQGEKYdGTKkRojKfYXNmEOGFBNk/seXaeun1Wc7rlzMUWsHajJ
w4Q6qcvPFbMjBUlpKi6F5LD8AIVH9ysP8lW1T9M64RXRDVbQ5Niq2Q==
-----END RSA PRIVATE KEY-----
```

**Environments:** ✅ Production, ✅ Preview, ✅ Development (select all)

**Click:** `Add`

---

### Step 3: Add Passphrase

**Variable Name:**
```
WHATSAPP_FLOW_KEY_PASSPHRASE
```

**Variable Value:**
```
AagamHolidays@Flow2024!
```

**Environments:** ✅ Production, ✅ Preview, ✅ Development (select all)

**Click:** `Add`

---

### Step 4: Redeploy

**Option A - From Dashboard:**
1. Go to **Deployments** tab
2. Click on latest deployment
3. Click `...` → **Redeploy**
4. Wait 1-2 minutes for completion

**Option B - Git Push:**
```bash
git add .
git commit -m "docs: add environment variable setup guide"
git push
```
Vercel auto-deploys on push.

---

## 🧪 Testing After Deployment

### Test 1: Send Template Again
```powershell
node scripts/whatsapp/send-tour-package-template.js +919978783238
```

### Test 2: Click "View Flow" Button
1. Open WhatsApp message
2. Click "View Flow" button
3. **Expected:** See destination options:
   - 🇻🇳 Vietnam
   - 🇹🇭 Thailand
   - 🇮🇩 Bali, Indonesia
   - 🇸🇬 Singapore
   - 🇲🇾 Malaysia
   - 🇦🇪 Dubai, UAE
   - 🇲🇻 Maldives
   - 🇪🇺 Europe

### Test 3: Complete Flow
1. Select destination (e.g., Vietnam)
2. Click "Continue"
3. Fill tour preferences
4. View packages
5. Select package
6. Fill booking details
7. Submit

**Expected:** ✅ Full flow works end-to-end

---

## 🔍 How to Verify Environment Variables Are Set

### In Vercel Dashboard:
1. Go to: Settings → Environment Variables
2. You should see (values masked):
   ```
   WHATSAPP_FLOW_PRIVATE_KEY    •••••••••••  Production, Preview, Development
   WHATSAPP_FLOW_KEY_PASSPHRASE •••••••••••  Production, Preview, Development
   ```

### Check Deployment Logs:
1. Deployments → Latest → Functions
2. Click on `/api/whatsapp/flow-endpoint`
3. Check logs for errors like:
   - ❌ "Private key not found" → Variable not set
   - ❌ "Incorrect passphrase" → Wrong passphrase
   - ✅ "💬 Decrypted Request" → Working correctly!

---

## 📊 Expected Flow Behavior

### Current State (BROKEN):
```
User clicks button
↓
Meta sends INIT (encrypted)
↓
❌ Endpoint can't decrypt (no keys)
↓
❌ Returns error/empty
↓
WhatsApp shows question but NO OPTIONS
```

### After Fix (WORKING):
```
User clicks button
↓
Meta sends INIT (encrypted)
↓
✅ Endpoint decrypts successfully
↓
✅ Returns DESTINATION_SELECTOR with 8 destinations
↓
✅ WhatsApp shows all 8 destination options
↓
User selects destination and continues...
```

---

## 🆘 Still Not Working?

### Check These:

1. **Environment Variables Saved?**
   - Verify both variables show in Vercel dashboard
   - Names are EXACT (case-sensitive)

2. **Redeployment Completed?**
   - Check Deployments tab shows "Ready"
   - Latest deployment timestamp is recent

3. **Check Function Logs:**
   ```
   Vercel → Deployments → Latest → Functions → /api/whatsapp/flow-endpoint
   ```
   Look for error messages

4. **Test Health Check:**
   ```powershell
   Invoke-RestMethod -Uri "https://admin.aagamholidays.com/api/whatsapp/flow-endpoint"
   ```
   Should return: `{"status":"active",...}`

---

## 📚 Related Documentation

- **Environment Setup Guide:** `docs/VERCEL_ENV_SETUP.md`
- **Public Key Upload:** `docs/UPLOAD_PUBLIC_KEY_MANUAL.md`
- **Flow JSON Fix:** `docs/FLOW_JSON_FIX_SUMMARY.md`

---

**Once environment variables are added and deployed, the flow will work perfectly!** 🎉
