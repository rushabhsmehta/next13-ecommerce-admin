# Vercel Build Error Fixes

## Problem Summary

The Vercel build was failing with two critical issues:

### 1. WhatsApp Prisma Client Engine Not Found
```
PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
```

**Root Cause**: The WhatsApp Prisma client (PostgreSQL) was being generated with `--no-engine` flag, which removed the necessary query engine binary. Unlike the main MySQL client which can use Prisma Data Proxy, the PostgreSQL client requires the full binary engine.

### 2. Export API Static Generation Errors
```
Invalid `prisma.inquiry.findMany()` invocation:
Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
```

**Root Cause**: Export API routes (`/api/export/inquiries-contacts`, `/api/export/queries-contacts`) were being statically pre-rendered during build, causing Prisma client initialization errors during the build process.

---

## Solutions Implemented

### Fix 1: Selective Prisma Client Generation

**Modified**: `package.json`

```json
"build": "prisma generate --no-engine && prisma generate --schema=prisma/whatsapp-schema.prisma && next build",
"postinstall": "prisma generate --no-engine && prisma generate --schema=prisma/whatsapp-schema.prisma",
"vercel-build": "prisma generate --no-engine && prisma generate --schema=prisma/whatsapp-schema.prisma && next build"
```

**Explanation**:
- **Main MySQL client** (`@prisma/client`): Generated with `--no-engine` because it connects via Prisma Data Proxy (doesn't need binary)
- **WhatsApp PostgreSQL client** (`@prisma/whatsapp-client`): Generated WITH full binary engine (includes `libquery_engine-rhel-openssl-3.0.x.so.node`)

### Fix 2: Enhanced Webpack Externals

**Modified**: `next.config.js`

```javascript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.externals.push({
      '@prisma/client': 'commonjs @prisma/client',
      '@prisma/whatsapp-client': 'commonjs @prisma/whatsapp-client',
    });
  }
  return config;
},
```

**Explanation**: Prevents Next.js from trying to bundle Prisma clients, allowing them to be loaded as external CommonJS modules with their binaries intact.

### Fix 3: Force Dynamic Rendering for Export APIs

**Modified**: 
- `src/app/api/export/inquiries-contacts/route.ts`
- `src/app/api/export/queries-contacts/route.ts`

```typescript
// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
```

**Explanation**: Prevents Next.js from attempting to statically pre-render these API routes during build time, which was causing Prisma client initialization errors.

---

## Verification Steps

After the next Vercel deployment completes:

1. **Check Build Logs**: Verify no more `PrismaClientInitializationError` messages
2. **Test Export APIs**: 
   - Visit `/api/export/inquiries-contacts` 
   - Visit `/api/export/queries-contacts`
3. **Test WhatsApp Features**: Ensure WhatsApp routes load without errors
4. **Performance Check**: Verify tour package query routes load in <1 second (from previous optimization)

---

## Technical Notes

### Why Two Different Approaches?

- **MySQL (Main DB)**: Uses Prisma Data Proxy/Connection Pooling → No binary needed → `--no-engine`
- **PostgreSQL (WhatsApp DB)**: Direct connection → Requires query engine binary → Full generation

### Binary Targets

The WhatsApp schema specifies:
```prisma
binaryTargets = ["native", "rhel-openssl-3.0.x"]
```

This ensures the correct binary is generated for:
- **native**: Local development
- **rhel-openssl-3.0.x**: Vercel's production environment

### Output Tracing

The Next.js config includes both clients in `outputFileTracingIncludes` to ensure they're copied to the final bundle:

```javascript
outputFileTracingIncludes: {
  '/api/**/*': [
    './node_modules/@prisma/client/**/*',
    './node_modules/.prisma/client/**/*',
    './node_modules/@prisma/whatsapp-client/**/*',
    './node_modules/.prisma/whatsapp-client/**/*',
  ],
}
```

---

## Deployment Status

**Commit**: `49f257bd` - "fix: WhatsApp Prisma client bundling and export API dynamic rendering"  
**Pushed**: ✅ Successfully pushed to GitHub  
**Vercel Deployment**: ⏳ Building...

Monitor deployment at: https://vercel.com/dashboard
