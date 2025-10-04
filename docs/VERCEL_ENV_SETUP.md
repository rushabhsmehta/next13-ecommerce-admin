# 🔐 Vercel Environment Variables Setup

## ✅ What Just Happened:

**Good news:** Your endpoint is deployed and working!
- ✅ Custom domain: `admin.aagamholidays.com`
- ✅ GET request: Returns health status
- ✅ POST request: Validates signatures (returns 432 for invalid signatures)

**The Problem:** Flow Builder returns **421 error** because the **encryption keys are missing** from Vercel.

---

## 📋 Step-by-Step: Add Environment Variables to Vercel

### 1️⃣ Go to Vercel Dashboard

1. Open: **https://vercel.com/dashboard**
2. Select your project: **next13-ecommerce-admin**
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)

---

### 2️⃣ Add Variable #1: Private Key

**Name:** `WHATSAPP_FLOW_PRIVATE_KEY`

**Value:** (Copy this ENTIRE block including BEGIN/END lines)

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

**Environments:** Select **Production, Preview, Development** (all)

**Click:** `Add`

---

### 3️⃣ Add Variable #2: Passphrase

**Name:** `WHATSAPP_FLOW_KEY_PASSPHRASE`

**Value:**
```
AagamHolidays@Flow2024!
```

**Environments:** Select **Production, Preview, Development** (all)

**Click:** `Add`

---

### 4️⃣ Redeploy Your Application

**Option A - Trigger Redeploy from Dashboard:**
1. Go to **Deployments** tab
2. Click on latest deployment
3. Click `...` menu → **Redeploy**
4. Wait for deployment to complete (usually 1-2 minutes)

**Option B - Push a commit:**
1. Make any small change (or empty commit)
2. Push to GitHub
3. Vercel auto-deploys

---

## 🧪 Test After Deployment

### Test 1: Health Check
```powershell
Invoke-RestMethod -Uri "https://admin.aagamholidays.com/api/whatsapp/flow-endpoint" -Method GET
```

**Expected:**
```json
{
  "status": "active",
  "endpoint": "WhatsApp Flow Endpoint",
  "timestamp": "2025-10-04T..."
}
```

### Test 2: Go to Flow Builder
1. Open: https://business.facebook.com/wa/manage/flows/
2. Open your flow: "Aagam Holidays - Destination Selector"
3. Click `...` → **Endpoint** → **Health Check**
4. **Expected:** ✅ "Health check successful"

### Test 3: Test Flow End-to-End
1. Click **Preview** in Flow Builder
2. Open on your phone
3. Try selecting a destination
4. **Expected:** No errors, destination saves successfully

---

## 🔍 Verify Environment Variables

After adding variables, check they're set:

**In Vercel Dashboard:**
- Settings → Environment Variables
- You should see:
  - ✅ `WHATSAPP_FLOW_PRIVATE_KEY` (masked value)
  - ✅ `WHATSAPP_FLOW_KEY_PASSPHRASE` (masked value)

---

## ⚠️ Important Notes

### About the Private Key Format:
- ✅ **DO** paste entire key including `-----BEGIN` and `-----END` lines
- ✅ **DO** include all newlines (Vercel handles them correctly)
- ❌ **DON'T** remove any characters or whitespace
- ❌ **DON'T** add quotes around the value in Vercel UI

### Security:
- 🔒 These values are **encrypted at rest** by Vercel
- 🔒 Only visible to **you** and **your deployment functions**
- 🔒 **Never** commit these to git (already in `.env` which is gitignored)

---

## 🆘 Troubleshooting

### Still Getting 421 Error?
**Check:**
1. Environment variables are saved in Vercel
2. Redeployment completed successfully (check Deployments tab)
3. Variable names are EXACTLY:
   - `WHATSAPP_FLOW_PRIVATE_KEY`
   - `WHATSAPP_FLOW_KEY_PASSPHRASE`
4. No extra spaces in variable names

### Check Vercel Function Logs:
1. Vercel Dashboard → Your Project
2. Click on latest deployment
3. Click **Functions** tab
4. Find `/api/whatsapp/flow-endpoint`
5. Check logs for decryption errors

### Common Errors in Logs:

**"Private key not found"**
- → `WHATSAPP_FLOW_PRIVATE_KEY` not set or wrong name

**"Incorrect passphrase"**
- → `WHATSAPP_FLOW_KEY_PASSPHRASE` is wrong or not set

**"Error decrypting request"**
- → Key pair mismatch (public key in Meta doesn't match private key)

---

## ✅ Success Checklist

- [ ] Added `WHATSAPP_FLOW_PRIVATE_KEY` to Vercel
- [ ] Added `WHATSAPP_FLOW_KEY_PASSPHRASE` to Vercel
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Redeployed application
- [ ] Health check passes in Flow Builder
- [ ] Test flow works end-to-end
- [ ] No 421 errors

---

## 📚 Related Documentation

- **Public Key Upload:** `docs/UPLOAD_PUBLIC_KEY_MANUAL.md`
- **Key Generation:** `docs/SECURE_KEYS_SETUP_GUIDE.md`
- **Full Integration Guide:** `docs/META_WHATSAPP_INTEGRATION.md`

---

**Once environment variables are added and redeployed, your WhatsApp Flow will be 100% functional!** 🎉
