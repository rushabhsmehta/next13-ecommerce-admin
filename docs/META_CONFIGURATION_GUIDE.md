# Meta WhatsApp Configuration Guide

## 🔐 Authentication Options

### Option 1: Quick Start (Permanent Token)
**Best for:** Small to medium applications, testing, development

```bash
# Required
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramq...  # Permanent token from System User
META_GRAPH_API_VERSION=v22.0
```

**Pros:**
- ✅ Simple setup
- ✅ Works immediately
- ✅ Permanent (doesn't expire with System User token)

**Cons:**
- ⚠️ No automatic token refresh
- ⚠️ Manual webhook verification

---

### Option 2: Production Setup (App Credentials)
**Best for:** Enterprise, production applications, high security

```bash
# Required
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
META_WHATSAPP_ACCESS_TOKEN=EAAVramq...
META_GRAPH_API_VERSION=v22.0

# Optional but Recommended for Production
META_APP_ID=1234567890
META_APP_SECRET=abc123def456...
META_WEBHOOK_VERIFY_TOKEN=your_custom_secure_token_here
```

**Pros:**
- ✅ Automatic token refresh capability
- ✅ Secure webhook verification
- ✅ Better security controls
- ✅ Long-term token management

**Cons:**
- ⚠️ More complex setup
- ⚠️ Requires additional configuration

---

## 📋 What Each Credential Does

| Credential | Purpose | Required? | Where to Get |
|------------|---------|-----------|--------------|
| **Phone Number ID** | Identifies your WhatsApp Business number | ✅ Yes | WhatsApp > API Setup |
| **Access Token** | Authenticates API requests | ✅ Yes | System User or Temp Token |
| **API Version** | Graph API version to use | ⚪ Optional | Default: v22.0 |
| **App ID** | Your Meta App identifier | ⚪ Optional | App Dashboard > Settings |
| **App Secret** | Your Meta App secret key | ⚪ Optional | App Dashboard > Settings |
| **Webhook Verify Token** | Secures webhook endpoint | ⚪ Optional | Create your own |

---

## 🚀 Setup Instructions

### Step 1: Get Your Phone Number ID

1. Go to https://developers.facebook.com/apps/
2. Select your WhatsApp Business App
3. Navigate to **WhatsApp > API Setup**
4. Copy the **Phone number ID**

```bash
META_WHATSAPP_PHONE_NUMBER_ID=131371496722301
```

---

### Step 2: Get Your Access Token

#### Method A: System User Token (Recommended for Production)
**Permanent - Never Expires**

1. Go to **Business Settings > System Users**
2. Create or select a System User
3. Click **Generate New Token**
4. Select your app
5. Choose permissions: `whatsapp_business_messaging`
6. Copy the token (save it securely!)

```bash
META_WHATSAPP_ACCESS_TOKEN=EAAVramq...
```

#### Method B: Temporary Token (Development Only)
**Expires in 24-72 hours**

1. Go to **WhatsApp > API Setup**
2. Click **Generate** next to Temporary access token
3. Copy the token
4. ⚠️ **Not recommended for production**

---

### Step 3: Optional App Credentials (For Production)

#### Get App ID and Secret

1. Go to **App Dashboard > Settings > Basic**
2. Copy **App ID**
3. Click **Show** next to **App Secret** and copy it

```bash
META_APP_ID=1234567890
META_APP_SECRET=abc123def456...
```

#### Create Webhook Verify Token

Create your own secure random string:

```bash
# Example (use your own!)
META_WEBHOOK_VERIFY_TOKEN=my_super_secret_verify_token_2024
```

---

### Step 4: Configure Webhooks (Optional)

1. Go to **WhatsApp > Configuration > Webhooks**
2. Click **Edit**
3. Enter your webhook URL:
   ```
   https://admin.aagamholidays.com/api/whatsapp/webhook
   ```
4. Enter your **Verify Token** (same as `META_WEBHOOK_VERIFY_TOKEN`)
5. Subscribe to these fields:
   - ✅ `messages` - Incoming messages
   - ✅ `message_status` - Delivery status updates

---

## 🧪 Testing Your Configuration

### Test 1: Environment Variables
```powershell
node scripts/whatsapp/test-meta-whatsapp.js
```

### Test 2: Send Message
```powershell
node scripts/whatsapp/send-meta-direct.js 919978783238 hello_world
```

### Test 3: Check Configuration Status
```javascript
import { getMetaConfigStatus } from '@/lib/whatsapp';

const status = getMetaConfigStatus();
console.log(status);
// {
//   hasPhoneNumberId: true,
//   hasAccessToken: true,
//   hasAppId: true,
//   hasAppSecret: true,
//   hasWebhookToken: true,
//   isFullyConfigured: true,
//   hasProductionAuth: true
// }
```

---

## 🔧 Advanced Features

### Token Exchange (App Credentials Required)

Convert short-lived token to long-lived (60 days):

```javascript
import { exchangeTokenForLongLived } from '@/lib/whatsapp';

const result = await exchangeTokenForLongLived(shortLivedToken);
if (result) {
  console.log('New token:', result.accessToken);
  console.log('Expires in:', result.expiresIn, 'seconds');
}
```

### Webhook Verification (Webhook Token Required)

Automatically handled by `/api/whatsapp/webhook` endpoint:

```typescript
// Webhook GET request handler
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const verified = verifyWebhookSignature(mode, token, challenge);
  return verified ? new NextResponse(verified) : new NextResponse('Forbidden', { status: 403 });
}
```

---

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ Store credentials in `.env.local` (gitignored)
- ✅ Never commit secrets to version control
- ✅ Use different tokens for development and production

### 2. Access Tokens
- ✅ Use **System User tokens** for production
- ✅ Rotate tokens regularly
- ✅ Store tokens securely (environment variables, secrets manager)
- ❌ Never hardcode tokens in source code

### 3. App Secret
- ✅ Keep App Secret confidential
- ✅ Never expose in client-side code
- ✅ Use server-side only

### 4. Webhook Verify Token
- ✅ Use a long, random string
- ✅ Different from access token
- ✅ Store securely

---

## 📊 Configuration Comparison

| Feature | Quick Start | Production |
|---------|-------------|------------|
| **Send Messages** | ✅ Yes | ✅ Yes |
| **Receive Webhooks** | ⚠️ Manual verification | ✅ Automatic |
| **Token Refresh** | ❌ No | ✅ Yes |
| **Security Level** | 🟡 Medium | 🟢 High |
| **Setup Complexity** | 🟢 Low | 🟡 Medium |
| **Recommended For** | Development, Testing | Production, Enterprise |

---

## 🆘 Troubleshooting

### "Missing Meta WhatsApp credentials"
- Check `.env.local` has `META_WHATSAPP_PHONE_NUMBER_ID` and `META_WHATSAPP_ACCESS_TOKEN`
- Restart your development server after adding variables

### "Invalid OAuth access token"
- Token may have expired (temp tokens expire in 24-72 hours)
- Generate new token or use System User token (permanent)

### Webhook verification fails
- Ensure `META_WEBHOOK_VERIFY_TOKEN` matches the token in Meta Dashboard
- Check webhook URL is correct and accessible

### Token exchange fails
- Verify `META_APP_ID` and `META_APP_SECRET` are correct
- Ensure app has `whatsapp_business_messaging` permission

---

## 📚 References

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [Access Token Guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [System User Tokens](https://developers.facebook.com/docs/marketing-api/system-users)

---

**Last Updated:** January 2025  
**Recommended Setup:** Production (with App Credentials)
