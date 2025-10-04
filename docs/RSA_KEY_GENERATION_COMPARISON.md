# RSA Key Generation Comparison

**Date**: October 4, 2025  
**Reference**: Meta's official documentation + WhatsApp-Flows-Tools examples  

## ⚠️ CRITICAL FINDING: Your Keys Don't Follow Meta's Recommendation

### Meta's Official Documentation (from screenshot)

According to Meta's [Flows Encryption Documentation](https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption):

```bash
# Generate private key with password/passphrase (RECOMMENDED)
openssl genrsa -des3 -out private.pem 2048

# Export public key from private key
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
```

**Key requirement**: `-des3` flag encrypts the private key with a passphrase for security.

### Official WhatsApp-Flows-Tools Example

```javascript
// From: WhatsApp-Flows-Tools/examples/endpoint/nodejs/basic/src/keyGenerator.js
const keyPair = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs1",
    format: "pem",
    cipher: "des-ede3-cbc",  // ← Encrypts private key
    passphrase,              // ← Requires passphrase
  },
});
```

**Requirement**: Passphrase is **REQUIRED** in official example.

### Your Implementation ❌

```powershell
# From: scripts/whatsapp/generate-flow-keys.ps1
openssl genrsa -out "$keyDirectory\private.pem" 2048  # ← NO -des3 flag!
openssl rsa -in "$keyDirectory\private.pem" -pubout -out "$keyDirectory\public.pem"
```

**Issue**: Your private key is generated **WITHOUT encryption** (no passphrase protection).

## 🔍 Detailed Comparison

| Aspect | Meta Documentation | Official Example | Your Script | Status |
|--------|-------------------|------------------|-------------|--------|
| **Command** | `openssl genrsa -des3` | `crypto.generateKeyPairSync` | `openssl genrsa` | ❌ **MISSING -des3** |
| **Key Size** | 2048 bits | 2048 bits | 2048 bits | ✅ **CORRECT** |
| **Passphrase** | Required (`-des3`) | Required (cipher + passphrase) | Not used | ❌ **MISSING** |
| **Private Key Encryption** | DES3 | `des-ede3-cbc` | None | ❌ **UNENCRYPTED** |
| **Public Key Format** | PEM (`-outform PEM -pubout`) | SPKI/PEM | PEM (`-pubout`) | ✅ **CORRECT** |
| **Private Key Type** | PKCS1 (default) | PKCS1 (`type: "pkcs1"`) | PKCS1 (default) | ✅ **CORRECT** |

## 🚨 Security Risk

### Your Current Setup:
- **Private key stored in plaintext** in `.env` file
- Anyone who gains access to your `.env` file can:
  - ✅ Read your private key immediately
  - ✅ Decrypt all WhatsApp Flow messages
  - ✅ Impersonate your endpoint

### Meta's Recommended Setup:
- **Private key encrypted with passphrase**
- Even if someone steals your `.env` file, they need:
  - ❌ The encrypted private key file
  - ❌ **AND** the passphrase (stored separately)
  - Both are required to decrypt messages

## ✅ How to Fix This

### Option 1: Generate New Keys Following Meta's Documentation

```powershell
# 1. Create directory for keys
New-Item -ItemType Directory -Force -Path ".\flow-keys"

# 2. Generate private key WITH passphrase protection (Meta's way)
openssl genrsa -des3 -out .\flow-keys\private.pem 2048
# You'll be prompted to enter a passphrase - remember it!

# 3. Extract public key
openssl rsa -in .\flow-keys\private.pem -outform PEM -pubout -out .\flow-keys\public.pem
# You'll be prompted to enter the passphrase again

# 4. Display public key (copy to Meta Flow Builder)
Get-Content .\flow-keys\public.pem
```

### Option 2: Use the Official Node.js Key Generator

```bash
# From WhatsApp-Flows-Tools/examples/endpoint/nodejs/basic/
node src/keyGenerator.js "YourSecurePassphrase123!"
```

This will output:
```
PASSPHRASE="YourSecurePassphrase123!"
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,xxxxx
...encrypted key content...
-----END RSA PRIVATE KEY-----"
```

## 🔧 Update Your Code to Support Passphrase

Your current code doesn't support passphrases. Update `route.ts`:

### Current Code (No Passphrase Support):
```typescript
const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
const decryptedAesKey = crypto.privateDecrypt(
  {
    key: crypto.createPrivateKey(privateKeyPem),  // ← Can't decrypt encrypted keys
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
  },
  Buffer.from(encrypted_aes_key, 'base64')
);
```

### Updated Code (With Passphrase Support):
```typescript
const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE || '';

const decryptedAesKey = crypto.privateDecrypt(
  {
    key: crypto.createPrivateKey({ 
      key: privateKeyPem, 
      passphrase  // ← Add passphrase support
    }),
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256',
  },
  Buffer.from(encrypted_aes_key, 'base64')
);
```

## 📋 Migration Steps

### Step 1: Update Your Key Generation Script

Create a new script: `scripts/whatsapp/generate-flow-keys-secure.ps1`

```powershell
# Generate RSA-2048 Key Pair with Passphrase Protection (Meta's Recommended Way)

$keyDirectory = ".\flow-keys"
New-Item -ItemType Directory -Force -Path $keyDirectory | Out-Null

Write-Host "Generating RSA-2048 key pair for WhatsApp Flow (with passphrase)..." -ForegroundColor Cyan
Write-Host "You will be prompted to enter a passphrase. REMEMBER IT!" -ForegroundColor Yellow

# Generate private key WITH DES3 encryption (Meta's way)
openssl genrsa -des3 -out "$keyDirectory\private.pem" 2048

Write-Host "`nExtracting public key..." -ForegroundColor Cyan
# Extract public key (will ask for passphrase)
openssl rsa -in "$keyDirectory\private.pem" -outform PEM -pubout -out "$keyDirectory\public.pem"

Write-Host "`nKey pair generated successfully!" -ForegroundColor Green

# Display public key
Write-Host "`n=== PUBLIC KEY (Copy to Meta Flow Builder) ===" -ForegroundColor Cyan
Get-Content "$keyDirectory\public.pem"

# Display private key (encrypted)
Write-Host "`n=== PRIVATE KEY (Encrypted with your passphrase) ===" -ForegroundColor Cyan
Get-Content "$keyDirectory\private.pem"

Write-Host "`n=== Add to .env ===" -ForegroundColor Yellow
Write-Host 'WHATSAPP_FLOW_PRIVATE_KEY="'
Get-Content "$keyDirectory\private.pem" | ForEach-Object { Write-Host $_ }
Write-Host '"'
Write-Host ''
Write-Host 'WHATSAPP_FLOW_KEY_PASSPHRASE="your-passphrase-here"'

Write-Host "`n=== SECURITY NOTES ===" -ForegroundColor Red
Write-Host "✅ Private key is encrypted with your passphrase"
Write-Host "✅ Store passphrase separately (e.g., environment variable)"
Write-Host "⚠️  NEVER commit .env file to Git"
Write-Host "⚠️  Add flow-keys/ to .gitignore"
```

### Step 2: Update Your Endpoint Code

```typescript
// In src/app/api/whatsapp/flow-endpoint/route.ts

function decryptRequest(encryptedRequest: EncryptedFlowRequest): {
  decryptedBody: FlowDataExchangeRequest;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
} {
  try {
    // Get private key and passphrase from environment
    const privateKeyPem = process.env.WHATSAPP_FLOW_PRIVATE_KEY;
    const passphrase = process.env.WHATSAPP_FLOW_KEY_PASSPHRASE || '';
    
    if (!privateKeyPem) {
      throw new Error('WHATSAPP_FLOW_PRIVATE_KEY not configured');
    }

    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = encryptedRequest;

    // Create private key with passphrase support
    const privateKey = crypto.createPrivateKey({
      key: privateKeyPem,
      passphrase  // ← Added passphrase support
    });

    // Step 1: Decrypt the AES key
    // @ts-ignore - Buffer type compatibility
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,  // ← Use the private key object
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encrypted_aes_key, 'base64') as any
    );

    // ... rest of decryption code stays the same
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt request');
  }
}
```

### Step 3: Update Environment Variables

```env
# .env (or .env.local)

# Private key (encrypted with passphrase)
WHATSAPP_FLOW_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,xxxxx
...encrypted content...
-----END RSA PRIVATE KEY-----"

# Passphrase for the private key
WHATSAPP_FLOW_KEY_PASSPHRASE="your-secure-passphrase-here"
```

### Step 4: Update Public Key on Meta

1. Go to **Meta Flow Builder**
2. Navigate to your flow → **⋯** (three dots) → **Endpoint**
3. Click **Sign public key**
4. Paste the NEW public key (from `flow-keys/public.pem`)
5. Click **Save**

## 🔄 Do You Need to Regenerate?

### When to Regenerate Keys:

✅ **YES - Regenerate if**:
- You want to follow Meta's security best practices
- Your private key might have been compromised
- You're moving to production
- You want passphrase protection

❌ **NO - Keep current keys if**:
- Currently in development/testing phase
- Keys are stored securely (encrypted secrets manager)
- You regenerate regularly anyway

### Current Risk Level: **MEDIUM** ⚠️

- Your encryption implementation is correct ✅
- Your keys work properly ✅
- But private key is **unencrypted in .env file** ❌
- If `.env` is leaked → immediate compromise ❌

## 📊 Comparison Summary

| Method | Security Level | Follows Meta Docs | Requires Passphrase | Your Current |
|--------|---------------|-------------------|---------------------|--------------|
| **Meta's Documentation** | 🔒🔒🔒 High | ✅ Yes | ✅ Yes | ❌ No |
| **Official Example** | 🔒🔒🔒 High | ✅ Yes | ✅ Yes | ❌ No |
| **Your Script** | 🔒🔒 Medium | ❌ No | ❌ No | ✅ **Current** |

## ✅ Recommendation

### Immediate Action (Choose One):

**Option A: Quick Fix (Development Only)**
- Keep current keys for now
- Add this to your TODO: "Regenerate keys with passphrase before production"
- Ensure `.env` is in `.gitignore`
- Use encrypted secrets in production (Vercel/Railway/etc.)

**Option B: Proper Fix (Recommended for Production)**
1. Run the updated script with `-des3` flag
2. Enter a strong passphrase when prompted
3. Update your code to support passphrases
4. Store passphrase in a separate secret (not in same `.env`)
5. Upload new public key to Meta
6. Test the flow

### Best Practice for Production:

```bash
# Store in separate locations
WHATSAPP_FLOW_PRIVATE_KEY=<encrypted-private-key>  # In Vercel env vars
WHATSAPP_FLOW_KEY_PASSPHRASE=<passphrase>          # In different secret vault
```

## 🎯 Final Verdict

### Your Key Generation: **WORKS BUT NOT SECURE** ⚠️

- ✅ Correct key size (2048 bits)
- ✅ Correct format (PEM)
- ✅ Keys work with your implementation
- ❌ **Does NOT follow Meta's documentation** (missing `-des3`)
- ❌ **Does NOT match official examples** (no passphrase)
- ❌ **Private key stored unencrypted**

### Action Required:
For **production deployment**, regenerate keys following Meta's documentation with passphrase protection.

For **development**, current keys work but understand the security risk.
