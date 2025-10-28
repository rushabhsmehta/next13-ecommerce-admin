# Prisma Client Configuration Fix

## Problem
Two issues on Vercel deployment:

### Issue 1: WhatsApp Prisma Engine Not Found
```
Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```
Route: `/whatsapp/customers`

### Issue 2: Notification API Using Wrong Database
```
Invalid `prisma.notification.findMany()` invocation:
Error validating datasource `db`: the URL must start with the protocol `prisma://`
```
Route: `/api/notifications`

## Root Cause

The issues were caused by:
1. **Missing Output Paths**: Both Prisma clients didn't have explicit output directories
2. **Incomplete Bundling**: Next.js wasn't bundling the main Prisma client properly
3. **Client Confusion**: Vercel build might have been mixing up the two Prisma clients

## Solutions Applied

### 1. Explicit Output Directories

**Main Schema** (`schema.prisma`):
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../node_modules/@prisma/client"  // ← Added explicit path
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

**WhatsApp Schema** (`prisma/whatsapp-schema.prisma`):
```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../node_modules/@prisma/whatsapp-client"  // ← Already had this
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("WHATSAPP_DATABASE_URL")
}
```

### 2. Updated Next.js Output File Tracing

**`next.config.js`**:
```javascript
experimental: {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/@prisma/client/**/*',           // ← Added main client
      './node_modules/.prisma/client/**/*',          // ← Added main client
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
    '/(dashboard)/**/*': [
      './node_modules/@prisma/client/**/*',           // ← Added main client
      './node_modules/.prisma/client/**/*',          // ← Added main client
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
  },
},
```

### 3. Build Script Ensures Both Clients

**`package.json`**:
```json
{
  "scripts": {
    "build": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build",
    "vercel-build": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build",
    "postinstall": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma"
  }
}
```

### 4. Vercel Build Configuration

**`vercel.json`**:
```json
{
  "buildCommand": "npm run vercel-build",
  "build": {
    "env": {
      "PRISMA_GENERATE_DATAPROXY": "false",
      "PRISMA_SKIP_POSTINSTALL_GENERATE": "false"
    }
  }
}
```

## What This Fixes

### ✅ Main Prisma Client (MySQL)
- **Used by**: Most of the app (inquiries, tour packages, customers, etc.)
- **Models**: Location, TourPackageQuery, Inquiry, Notification, etc.
- **Output**: `node_modules/@prisma/client`
- **Database**: MySQL (DATABASE_URL)

### ✅ WhatsApp Prisma Client (PostgreSQL)  
- **Used by**: WhatsApp features only
- **Models**: WhatsAppMessage, WhatsAppCustomer, WhatsAppCampaign, etc.
- **Output**: `node_modules/@prisma/whatsapp-client`
- **Database**: PostgreSQL (WHATSAPP_DATABASE_URL)

## Testing

### Local Test
```bash
# Regenerate both clients
npx prisma generate
npx prisma generate --schema=prisma/whatsapp-schema.prisma

# Test build
npm run vercel-build
```

**Expected Output**:
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
✔ Generated Prisma Client to ./node_modules/@prisma/whatsapp-client
✔ Compiled successfully
```

### After Deployment

Test these routes:
1. **Notification API**: `https://admin.aagamholidays.com/api/notifications`
   - Should return: `{ notifications: [], unreadCount: 0 }`
   - Should NOT error with "URL must start with prisma://"

2. **WhatsApp Customers**: `https://admin.aagamholidays.com/whatsapp/customers`
   - Should load the page
   - Should NOT error with "Query Engine not found"

3. **Tour Package Query**: `https://admin.aagamholidays.com/tourPackageQuery`
   - Should load quickly (< 1 second)
   - Performance optimization should be active

## Deployment Steps

```bash
# 1. Commit all changes
git add .
git commit -m "fix: prisma client configuration for vercel deployment"

# 2. Push to trigger deployment
git push

# 3. Vercel will:
#    - Run postinstall (generates both clients)
#    - Run vercel-build (generates again + builds)
#    - Bundle both Prisma clients with correct engines
#    - Deploy successfully
```

## Files Modified

1. ✅ `schema.prisma` - Added explicit output path
2. ✅ `next.config.js` - Added main client to bundling
3. ✅ `package.json` - Build scripts already correct
4. ✅ `vercel.json` - Build configuration already correct
5. ✅ `src/lib/prismadb.ts` - Cleaned up comments

## Why This Works

**Before**:
- Main client had no explicit output → Vercel might generate to wrong location
- Output file tracing only included WhatsApp client → Main client not bundled
- Two clients could interfere with each other

**After**:
- Both clients have explicit, different output directories
- Both clients are traced and bundled
- Clear separation: `@prisma/client` vs `@prisma/whatsapp-client`
- Both engines (rhel-openssl-3.0.x) are generated and bundled

## Verification Checklist

After deployment:

- [ ] `/api/notifications` returns data (not "prisma://" error)
- [ ] `/whatsapp/customers` loads (not "engine not found" error)
- [ ] `/tourPackageQuery` loads in < 1 second
- [ ] Main app functionality works (inquiries, tour packages, etc.)
- [ ] WhatsApp features work (chat, campaigns, catalog)
- [ ] No Prisma-related errors in Vercel function logs

---

**Status**: ✅ Ready for Deployment  
**Impact**: Fixes both Prisma client issues on Vercel  
**Risk**: Low (explicitly configures what was implicit before)
