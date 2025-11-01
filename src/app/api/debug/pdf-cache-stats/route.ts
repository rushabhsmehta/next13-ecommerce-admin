import { pdfCache } from '@/lib/pdf-cache';
import { NextResponse } from 'next/server';

/**
 * Debug endpoint to monitor PDF cache performance
 * Returns cache statistics: hit rate, memory usage, cached PDFs, etc.
 * 
 * Access: GET /api/debug/pdf-cache-stats
 * Response includes:
 * - cachedPdfs: Number of PDFs currently in cache
 * - memoryUsageMB: Total memory used by cached PDFs
 * - totalRequests: Total PDF requests (hits + misses)
 * - totalHits: Successful cache hits
 * - hitRate: Hit rate percentage
 * - cacheEntries: Details of each cached PDF
 */
export async function GET() {
  try {
    const stats = pdfCache.getStats();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      message: `Cache is storing ${stats.cachedPdfs} PDFs using ${stats.memoryUsageMB}MB of memory with ${stats.hitRate} hit rate`
    });
  } catch (error) {
    console.error('[PDF Cache Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
