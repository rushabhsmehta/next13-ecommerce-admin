# 🔑 Manual Public Key Upload Guide

**Since the API upload isn't working, follow these steps to upload your public key manually via Meta Flow Builder UI.**

---

## ✅ Step 1: Copy Your Public Key

**Copy this EXACT text** (including `-----BEGIN` and `-----END` lines):

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

---

## 🌐 Step 2: Open Flow Builder

1. Go to: **https://business.facebook.com/wa/manage/flows/**

2. **Find your flow**: "Aagam Holidays - Destination Selector"

3. **Click on the flow** to open it

---

## ⚙️ Step 3: Open Endpoint Settings

1. In Flow Builder, click the **three dots menu (⋯)** at the top right

2. Select **"Endpoint"** from the dropdown

3. You should see your endpoint URL:
   ```
   https://next13-ecommerce-admin.vercel.app/api/whatsapp/flow-endpoint
   ```

---

## 📋 Step 4: Paste Public Key

1. Look for **"Sign public key"** section

2. **Paste the public key** (from Step 1) into the text box

3. Click **"Save"** or **"Upload"**

---

## ✅ Step 5: Verify Success

After uploading, you should see:

```
✅ Public key signature status: VALID
```

**If you see "VALID"** → Success! Your flow is now ready to encrypt data! 🎉

**If you see "INVALID"** → The key format is wrong. Make sure you copied ALL lines including headers.

---

## 🚀 Step 6: Test Your Flow

1. In Flow Builder, click **"Preview"**

2. Test the flow on your phone

3. Try selecting a destination

4. **Expected behavior**:
   - ✅ Destination selector loads (no 405 error)
   - ✅ You can select a destination
   - ✅ Selection gets saved to your database

---

## 🔧 Step 7: Update Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Add/Update these 2 variables:**

### Variable 1: `WHATSAPP_FLOW_PRIVATE_KEY`

**Value** (copy-paste this EXACT text):
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

**Important:** Vercel will handle the newlines correctly. Just paste it as-is.

---

### Variable 2: `WHATSAPP_FLOW_KEY_PASSPHRASE`

**Value:**
```
AagamHolidays@Flow2024!
```

---

## 🔄 Step 8: Redeploy

After adding environment variables:

1. **Redeploy** your Vercel project (or trigger a new deployment)
2. Wait for deployment to complete
3. Test the flow again

---

## ✅ Success Checklist

- [x] Public key uploaded in Flow Builder
- [x] Status shows "VALID" ✅
- [x] Private key added to Vercel env vars
- [x] Passphrase added to Vercel env vars
- [x] Vercel redeployed with new env vars
- [x] Flow tested and working

---

## 🎉 You're Done!

Your WhatsApp Flow is now fully encrypted and production-ready!

**Test it by:**
1. Opening the flow in WhatsApp
2. Selecting a destination
3. Checking your database to confirm the selection was saved

---

## 📚 Reference Files

- **Public Key**: `flow-keys/public.pem`
- **Private Key**: `flow-keys/private.pem`
- **Endpoint Code**: `src/app/api/whatsapp/flow-endpoint/route.ts`
- **Environment**: `.env` (local) / Vercel Dashboard (production)

---

## 🆘 Troubleshooting

### Public Key Shows "INVALID"
- Make sure you copied ALL lines including `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----`
- Don't add extra spaces or remove newlines

### Flow Still Shows 405 Error
- Check that private key is in Vercel environment variables
- Make sure passphrase is correct
- Verify Vercel deployment completed successfully
- Check Vercel function logs for errors

### Decryption Errors in Logs
- Verify passphrase matches: `AagamHolidays@Flow2024!`
- Make sure private key wasn't modified
- Check that both keys were generated together (same pair)

---

**Need help?** Check the full documentation in `docs/META_WHATSAPP_INTEGRATION.md`
