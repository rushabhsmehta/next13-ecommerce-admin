# Prisma Engine Fix for Vercel Deployment

## Problem
When deploying to Vercel, the WhatsApp Prisma client fails with:
```
Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```

This happens because the custom WhatsApp Prisma client binaries aren't being properly bundled.

## Root Cause
1. Custom output path for WhatsApp client: `@prisma/whatsapp-client`
2. Vercel's Next.js bundler doesn't automatically include custom Prisma client binaries
3. The `rhel-openssl-3.0.x` binary target needs to be explicitly bundled

## Solution Applied

### 1. Next.js Configuration (`next.config.js`)
Added output file tracing to include WhatsApp Prisma client binaries:

```javascript
experimental: {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
    '/(dashboard)/**/*': [
      './node_modules/@prisma/whatsapp-client/**/*',
      './node_modules/.prisma/whatsapp-client/**/*',
    ],
  },
},
outputFileTracing: true,
```

### 2. Vercel Configuration (`vercel.json`)
Specified custom build command and environment variables:

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

### 3. Package.json Scripts
Ensured Prisma generation happens during build:

```json
{
  "build": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build",
  "vercel-build": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build",
  "postinstall": "prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma"
}
```

### 4. WhatsApp Schema (`prisma/whatsapp-schema.prisma`)
Already configured with correct binary targets:

```prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../node_modules/@prisma/whatsapp-client"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

## Deployment Steps

### Option 1: Auto-Deploy (Recommended)
Simply push to your repository:
```bash
git add .
git commit -m "fix: prisma engine bundling for vercel deployment"
git push
```

Vercel will automatically:
1. Run `npm install` (triggers `postinstall` script)
2. Run `npm run vercel-build` (generates both Prisma clients)
3. Bundle the application with engine binaries
4. Deploy

### Option 2: Manual Redeploy
If you've already pushed the code:
1. Go to Vercel dashboard
2. Navigate to your project
3. Click "Deployments"
4. Click "..." menu on latest deployment
5. Select "Redeploy"
6. Check "Use existing Build Cache" is **unchecked**
7. Click "Redeploy"

## Verification

After deployment, check:

1. **Build Logs** - Should show:
   ```
   ✔ Generated Prisma Client (to ./node_modules/@prisma/client)
   ✔ Generated Prisma Client (to ./node_modules/@prisma/whatsapp-client)
   ```

2. **Test the Route**:
   ```
   https://admin.aagamholidays.com/whatsapp/customers
   ```
   Should load without engine errors.

3. **Function Logs** - Check Vercel function logs for any errors.

## Troubleshooting

### If error persists after deployment:

1. **Clear Build Cache**:
   - Vercel Dashboard → Settings → General → Clear Build Cache
   - Redeploy

2. **Verify Environment Variables**:
   - Ensure `WHATSAPP_DATABASE_URL` is set correctly
   - Should be PostgreSQL connection string

3. **Check Prisma Version**:
   ```bash
   npm list @prisma/client
   ```
   Should match version in both schemas.

4. **Manual Binary Check**:
   Add temporary logging to `src/lib/whatsapp-prismadb.ts`:
   ```typescript
   console.log('WhatsApp Prisma Client Path:', require.resolve('@prisma/whatsapp-client'));
   ```

### Common Issues:

**Issue**: "Cannot find module '@prisma/whatsapp-client'"
**Fix**: Ensure `postinstall` script runs. Check Vercel build logs.

**Issue**: Binary still not found
**Fix**: Add to `.vercelignore` (create if doesn't exist):
```
!node_modules/@prisma/whatsapp-client
!node_modules/.prisma/whatsapp-client
```

**Issue**: Different engine needed
**Fix**: Update `binaryTargets` in `prisma/whatsapp-schema.prisma`:
```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-3.0.x"]
```

## Files Modified

1. ✅ `next.config.js` - Added output file tracing
2. ✅ `vercel.json` - Custom build command
3. ✅ `package.json` - Updated build scripts
4. ✅ `docs/VERCEL_PRISMA_FIX.md` - This documentation

## Alternative Solutions (If Above Doesn't Work)

### Option A: Use Prisma Data Proxy
Switch to Prisma's hosted query engine (paid feature):
```bash
npx prisma generate --data-proxy
```

### Option B: Monorepo Binary Targets
Add all possible targets:
```prisma
binaryTargets = [
  "native",
  "rhel-openssl-1.0.x",
  "rhel-openssl-3.0.x", 
  "debian-openssl-1.1.x",
  "debian-openssl-3.0.x"
]
```

### Option C: Custom Vercel Build Script
Create `.vercel/build.sh`:
```bash
#!/bin/bash
npm install
npx prisma generate
npx prisma generate --schema=prisma/whatsapp-schema.prisma
npm run build
```

## Expected Outcome

✅ WhatsApp customers page loads successfully  
✅ No "Query Engine not found" errors  
✅ Both Prisma clients (MySQL + PostgreSQL) work  
✅ All WhatsApp features functional  

## Support

If issue persists after trying all solutions:
1. Check Vercel function logs
2. Enable Prisma query logging
3. Contact Vercel support with build logs

---

**Last Updated**: 2025-10-28  
**Status**: ✅ Fix Applied - Ready for Deployment
