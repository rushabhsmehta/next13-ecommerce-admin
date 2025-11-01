# PDF Caching Solution - Architecture & Implementation Guide

## 🎯 Problem Statement

**Current Situation**:
- Every PDF download request runs Puppeteer/Chromium in full
- Chromium startup: ~200-500ms per PDF
- Memory spike: 50-100MB per PDF generation
- Multiple users generating same PDF = wasted resources

**Scenario**: 
- User generates tour package voucher (PDF)
- 1 hour later, another user generates same voucher (same tourPackageQueryId)
- Result: Chromium spins up again unnecessarily

---

## 💡 Proposed Solution: Multi-Layer Caching Strategy

### **Layer 1: Content Hash-Based Cache** (Memory + Database)
**Concept**: Cache PDFs by HTML content hash instead of just user/ID

```
HTML Content → SHA256 Hash → Lookup Cache → Serve if exists
                                    ↓
                              If not exists:
                              Generate PDF → Store with Hash
```

**Why Hash?**:
- Same tour package with same data = same HTML = same hash
- Works across users (many users, one cached PDF)
- Survives database content changes (new hash = new cache entry)

---

### **Layer 2: Time-Based Expiration**
```
Cache Entry: {
  contentHash: "abc123...",
  pdfBuffer: <Buffer>,
  createdAt: 2025-11-01T10:00:00Z,
  expiresAt: 2025-11-01T16:00:00Z,  // 6 hours
  hitCount: 15
}
```

**Benefits**:
- PDFs don't become stale (6 hour TTL typical)
- Automatically frees memory
- Predictable cache lifecycle

---

### **Layer 3: Storage Backends**

#### **Option A: In-Memory Cache (Fast but Limited)**
```typescript
// Use node-cache or simple Map
const pdfCache = new Map<string, CacheEntry>();

// Memory usage: ~50MB per 10 PDF variants
// Hit rate: 70-90% for repeat customers
// Cost: Only RAM, no database writes
```

**Pros**: ✅ Instant lookup, zero database latency
**Cons**: ❌ Resets on server restart, limited by memory

**Best for**: Hosted environments (Railway) with persistent servers

---

#### **Option B: Database Cache (Persistent)**
```sql
CREATE TABLE pdf_cache (
  id UUID PRIMARY KEY,
  contentHash VARCHAR(64) UNIQUE,
  pdfBuffer BYTEA,
  createdAt TIMESTAMP,
  expiresAt TIMESTAMP,
  hitCount INTEGER,
  contentType VARCHAR(50)
);

CREATE INDEX idx_content_hash ON pdf_cache(contentHash);
CREATE INDEX idx_expires_at ON pdf_cache(expiresAt);
```

**Pros**: ✅ Survives server restarts, scalable, shareable across instances
**Cons**: ❌ Database reads slower, storage overhead

**Best for**: Multi-instance deployments

---

#### **Option C: Hybrid Cache (Recommended) ⭐**
```
User Request
    ↓
1. Check In-Memory Cache (10-50ms) ← Fast
    ↓
2. If miss, check Database Cache (50-200ms) ← Reliable
    ↓
3. If miss, Generate PDF (2000-5000ms) ← Expensive
    ↓
4. Store in both caches, return to user
```

**Hybrid Benefits**:
- ✅ Fast for repeat users (memory hit)
- ✅ Survives restarts (database)
- ✅ Scales across multiple servers (database syncing)
- ✅ Minimal storage cost

---

## 🏗️ Implementation Architecture

### **Components to Build**:

1. **`src/lib/pdf-cache.ts`** - Caching logic
2. **`prisma/schema.prisma`** - Add PdfCache model (if using DB)
3. **`src/app/api/generate-pdf/route.ts`** - Update to use cache
4. **`src/lib/cache-cleanup.ts`** - Cleanup expired entries
5. **`vercel.json`** - Cron job for cleanup

---

## 📊 Detailed Implementation Plan

### **Step 1: Create Cache Manager Class**

```typescript
// src/lib/pdf-cache.ts

interface CacheEntry {
  contentHash: string;
  pdfBuffer: Buffer;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  metadata?: {
    tourPackageQueryId?: string;
    tourPackageId?: string;
    createdBy?: string;
  };
}

class PdfCacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 6 * 60 * 60 * 1000; // 6 hours

  // Generate content hash
  generateHash(htmlContent: string): string {
    return crypto
      .createHash('sha256')
      .update(htmlContent)
      .digest('hex');
  }

  // Get from memory first, then database
  async get(contentHash: string): Promise<CacheEntry | null> {
    // 1. Try memory cache
    const memEntry = this.memoryCache.get(contentHash);
    if (memEntry && !this.isExpired(memEntry)) {
      memEntry.hitCount++;
      return memEntry;
    }

    // 2. Try database cache
    const dbEntry = await prismadb.pdfCache.findUnique({
      where: { contentHash }
    });
    
    if (dbEntry && !this.isExpired(dbEntry)) {
      // Promote to memory cache
      this.memoryCache.set(contentHash, dbEntry as CacheEntry);
      return dbEntry as CacheEntry;
    }

    return null;
  }

  // Save to both caches
  async set(
    htmlContent: string,
    pdfBuffer: Buffer,
    metadata?: CacheEntry['metadata']
  ): Promise<string> {
    const contentHash = this.generateHash(htmlContent);
    
    const entry: CacheEntry = {
      contentHash,
      pdfBuffer,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.cacheTTL),
      hitCount: 1,
      metadata
    };

    // Save to memory
    this.memoryCache.set(contentHash, entry);

    // Save to database
    await prismadb.pdfCache.upsert({
      where: { contentHash },
      create: entry,
      update: {
        hitCount: { increment: 1 },
        expiresAt: entry.expiresAt
      }
    });

    return contentHash;
  }

  // Check expiration
  private isExpired(entry: CacheEntry): boolean {
    return new Date() > entry.expiresAt;
  }

  // Cleanup expired entries (run periodically)
  async cleanupExpired(): Promise<number> {
    // Memory cleanup
    for (const [hash, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(hash);
      }
    }

    // Database cleanup
    const result = await prismadb.pdfCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    return result.count;
  }

  // Get cache stats (for monitoring)
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
      memoryCacheSizeBytes: this.estimateMemoryUsage(),
      ttl: this.cacheTTL
    };
  }

  private estimateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.memoryCache.values()) {
      total += entry.pdfBuffer.length;
    }
    return total;
  }
}

export const pdfCache = new PdfCacheManager();
```

---

### **Step 2: Add PdfCache Model to Prisma Schema**

```prisma
// schema.prisma

model PdfCache {
  id            String   @id @default(cuid())
  contentHash   String   @unique
  pdfBuffer     Bytes
  createdAt     DateTime @default(now())
  expiresAt     DateTime
  hitCount      Int      @default(1)
  metadata      Json?    // Store tourPackageQueryId, etc.

  @@index([expiresAt])
  @@index([hitCount])
}
```

---

### **Step 3: Update PDF Generation Route**

```typescript
// src/app/api/generate-pdf/route.ts

import { generatePDF } from "@/utils/generatepdf";
import { pdfCache } from "@/lib/pdf-cache";

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  try {
    const { 
      htmlContent, 
      headerHtml, 
      footerHtml, 
      margin, 
      scale,
      cacheKey // Optional: tourPackageQueryId, tourPackageId, etc.
    } = await req.json();

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "htmlContent is required" }),
        { status: 400 }
      );
    }

    // 1. Check cache
    const contentHash = pdfCache.generateHash(htmlContent);
    let pdfBuffer: Buffer | null = null;
    let cacheHit = false;

    const cachedEntry = await pdfCache.get(contentHash);
    if (cachedEntry) {
      pdfBuffer = cachedEntry.pdfBuffer;
      cacheHit = true;
      console.log('✅ [PDF Cache] HIT:', { contentHash, cacheKey });
    }

    // 2. Generate if not cached
    if (!pdfBuffer) {
      console.log('❌ [PDF Cache] MISS, generating:', { contentHash, cacheKey });
      pdfBuffer = await generatePDF(htmlContent, { 
        headerHtml, 
        footerHtml, 
        margin, 
        scale 
      });

      // 3. Store in cache
      await pdfCache.set(htmlContent, pdfBuffer, {
        cacheKey,
        createdAt: new Date().toISOString()
      });
    }

    // 4. Return PDF
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=generated.pdf",
        "X-Cache-Hit": cacheHit ? "true" : "false",
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        error: "PDF generation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500 }
    );
  }
}
```

---

### **Step 4: Create Cleanup Job**

```typescript
// src/lib/cache-cleanup.ts

import { pdfCache } from './pdf-cache';

export async function cleanupExpiredPdfCache() {
  try {
    console.log('🧹 [PDF Cache] Starting cleanup...');
    const deletedCount = await pdfCache.cleanupExpired();
    console.log(`✅ [PDF Cache] Cleanup complete. Deleted ${deletedCount} expired entries.`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('❌ [PDF Cache] Cleanup failed:', error);
    return { success: false, error };
  }
}
```

**Add cron trigger** (if using Vercel):

```typescript
// src/app/api/cron/cleanup-pdf-cache/route.ts

import { cleanupExpiredPdfCache } from '@/lib/cache-cleanup';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await cleanupExpiredPdfCache();
  return new Response(JSON.stringify(result));
}
```

**Add to vercel.json**:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-pdf-cache",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }]
}
```

---

## 💰 Expected Cost Savings

### **Before Caching**:
- 50 PDFs/day × 300ms CPU = 15,000ms = 2.5 minutes/day
- 2.5 min × 30 days = 75 minutes/month
- **Cost**: ~$2-5/month

### **After Caching** (70% hit rate):
- 15 PDFs/day × 300ms = 4,500ms = 0.75 minutes/day
- 0.75 min × 30 days = 22.5 minutes/month
- **Cost**: ~$0.50-1.50/month
- **Savings**: $1.50-3.50/month + better UX

---

## 📈 Additional Benefits

✅ **Performance**: PDF serves in 50-100ms (cached) vs 2-5s (generated)
✅ **User Experience**: Instant downloads for repeated PDFs
✅ **Database Reduction**: Single query instead of reload for tour data
✅ **Scalability**: Works across multiple server instances
✅ **Monitoring**: Track cache hit rates, identify optimization opportunities

---

## 🔧 Configuration Options

```typescript
// Can be customized based on needs:

const CACHE_CONFIG = {
  TTL: 6 * 60 * 60 * 1000,           // 6 hours
  MAX_MEMORY_SIZE: 500 * 1024 * 1024, // 500MB memory limit
  ENABLE_DATABASE_CACHE: true,        // Store in DB
  ENABLE_CLEANUP_CRON: true,          // Auto-cleanup
  LOG_CACHE_STATS: true               // Debug logging
};
```

---

## 📋 Rollout Plan

### **Phase 1** (15 min): 
1. Add `src/lib/pdf-cache.ts` - Core caching logic
2. Create PdfCache Prisma model
3. Run migration

### **Phase 2** (10 min):
1. Update `src/app/api/generate-pdf/route.ts` - Use cache
2. Test with manual PDF generation

### **Phase 3** (5 min):
1. Add cleanup job (`src/lib/cache-cleanup.ts`)
2. Deploy cron to vercel.json

### **Phase 4** (Monitoring):
1. Track cache hit rates in logs
2. Monitor database storage
3. Adjust TTL if needed

---

## ⚠️ Edge Cases to Handle

1. **Cache Invalidation**: When tour data changes, old PDFs still valid?
   - **Solution**: TTL handles this (6 hours max staleness acceptable)
   - **Option**: Add manual invalidation endpoint for immediate updates

2. **Large PDF Files**: What if PDF > 50MB?
   - **Solution**: Skip cache for very large files (configure threshold)

3. **Concurrent Requests**: Two users request same PDF simultaneously?
   - **Solution**: Use async locks to prevent duplicate generation

4. **Database Size**: Cache table grows unbounded?
   - **Solution**: Cleanup job deletes expired entries every 6 hours

---

## 🎯 Success Metrics

Track these after implementation:

```
Cache Hit Rate:        Target > 60%
Memory Usage:          Should stabilize < 200MB
DB Storage (pdf_cache): Monitor growth
PDF Generation Time:   Should be instant on hit
Cost/Month:            Should decrease by 50%+
```

---

## Summary

**Recommended Approach**: **Hybrid Cache (Memory + Database)**

| Aspect | Impact |
|--------|--------|
| **Implementation Time** | 30 minutes |
| **Cost Savings** | $1.50-3.50/month |
| **Performance Gain** | 20-50x faster on cache hit |
| **Complexity** | Low-Medium |
| **Risk** | Very Low (cache is optional enhancement) |

**Verdict**: ✅ **HIGH ROI - Implement First**

