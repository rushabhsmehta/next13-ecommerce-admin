import crypto from 'crypto';

interface CacheEntry {
  pdfBuffer: Buffer;
  expiresAt: Date;
  lastAccessed: Date;
  hitCount: number;
}

/**
 * SimplePdfCache - Memory-based PDF caching for high-frequency single/dual-user scenarios
 * 
 * Features:
 * - Content hash-based caching (same HTML = same cached PDF)
 * - LRU (Least Recently Used) eviction when cache is full
 * - 24-hour TTL (time-to-live) per cache entry
 * - Automatic expiration cleanup on get
 * 
 * Perfect for:
 * - 1-2 users generating 20-25 PDFs per day
 * - Repeated generation of same tours (high hit rate ~80-90%)
 * - Expected cache hit time: 50-100ms vs 2-5 seconds for generation
 */
class SimplePdfCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly MAX_ENTRIES = 50;           // Max PDFs to keep in memory
  private readonly TTL = 24 * 60 * 60 * 1000;  // 24 hours
  private totalRequests = 0;
  private cacheHits = 0;

  /**
   * Generate SHA256 hash of HTML content
   * Same HTML content = same hash = same cache key
   */
  generateHash(htmlContent: string): string {
    return crypto.createHash('sha256').update(htmlContent).digest('hex');
  }

  /**
   * Retrieve PDF from cache if it exists and hasn't expired
   */
  get(contentHash: string): Buffer | null {
    this.totalRequests++;
    const entry = this.cache.get(contentHash);
    
    if (!entry) {
      console.log(`📭 [PDF Cache] MISS - Hash: ${contentHash.slice(0, 8)}...`);
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt.getTime()) {
      console.log(`⏰ [PDF Cache] EXPIRED - Removing: ${contentHash.slice(0, 8)}...`);
      this.cache.delete(contentHash);
      return null;
    }

    // Cache hit!
    this.cacheHits++;
    entry.hitCount++;
    entry.lastAccessed = new Date();
    const hitRate = ((this.cacheHits / this.totalRequests) * 100).toFixed(1);
    console.log(`✅ [PDF Cache] HIT (${this.cacheHits}/${this.totalRequests} = ${hitRate}%) - Hash: ${contentHash.slice(0, 8)}...`);
    
    return entry.pdfBuffer;
  }

  /**
   * Store PDF in cache
   * If cache is full, removes least recently used entry
   */
  set(htmlContent: string, pdfBuffer: Buffer): string {
    const hash = this.generateHash(htmlContent);
    const sizeKB = (pdfBuffer.length / 1024).toFixed(1);

    // If cache is full, remove least recently used (oldest lastAccessed time)
    if (this.cache.size >= this.MAX_ENTRIES) {
      let oldestHash = '';
      let oldestTime = Date.now();
      
      this.cache.forEach((entry, h) => {
        if (entry.lastAccessed.getTime() < oldestTime) {
          oldestTime = entry.lastAccessed.getTime();
          oldestHash = h;
        }
      });
      
      if (oldestHash) {
        console.log(`🗑️  [PDF Cache] LRU EVICTION - Removing oldest entry: ${oldestHash.slice(0, 8)}...`);
        this.cache.delete(oldestHash);
      }
    }

    // Store in cache
    this.cache.set(hash, {
      pdfBuffer,
      expiresAt: new Date(Date.now() + this.TTL),
      lastAccessed: new Date(),
      hitCount: 1
    });

    console.log(`💾 [PDF Cache] STORED (${sizeKB}KB) - Hash: ${hash.slice(0, 8)}... (Total: ${this.cache.size}/${this.MAX_ENTRIES})`);
    return hash;
  }

  /**
   * Get cache performance statistics
   */
  getStats() {
    const memoryUsageBytes = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.pdfBuffer.length, 0);
    
    const memoryUsageMB = (memoryUsageBytes / (1024 * 1024)).toFixed(2);
    const hitRate = this.totalRequests > 0 
      ? ((this.cacheHits / this.totalRequests) * 100).toFixed(1)
      : '0.0';

    const cacheEntries: any[] = [];
    this.cache.forEach((entry, hash) => {
      cacheEntries.push({
        hash: hash.slice(0, 12) + '...',
        sizeKB: (entry.pdfBuffer.length / 1024).toFixed(1),
        hitCount: entry.hitCount,
        expiresIn: {
          minutes: Math.ceil((entry.expiresAt.getTime() - Date.now()) / (60 * 1000))
        },
        lastAccessedSeconds: Math.ceil((Date.now() - entry.lastAccessed.getTime()) / 1000)
      });
    });

    return {
      cachedPdfs: this.cache.size,
      maxEntries: this.MAX_ENTRIES,
      memoryUsageMB: parseFloat(memoryUsageMB),
      memoryUsageBytes,
      totalRequests: this.totalRequests,
      totalHits: this.cacheHits,
      hitRate: `${hitRate}%`,
      ttlHours: this.TTL / (60 * 60 * 1000),
      cacheEntries
    };
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.totalRequests = 0;
    this.cacheHits = 0;
    console.log(`🗑️  [PDF Cache] CLEARED - Removed ${count} entries`);
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    return Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.pdfBuffer.length, 0);
  }
}

// Export singleton instance
export const pdfCache = new SimplePdfCache();
