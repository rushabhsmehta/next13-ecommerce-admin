import { NextResponse } from 'next/server';

/**
 * ⚠️ IMPORTANT LIMITATION FOR SERVERLESS DEPLOYMENTS ⚠️
 * 
 * This in-memory rate limiter will NOT work correctly in serverless environments
 * like Vercel because:
 * 1. Each serverless function invocation has isolated memory
 * 2. The Map will be reset on cold starts
 * 3. Rate limits won't be enforced across different function instances
 * 
 * For production use on Vercel, use one of these alternatives:
 * - @upstash/ratelimit with Redis (recommended for Vercel)
 * - Vercel Edge Config for rate limiting
 * - Database-backed rate limiting (slower but works)
 * 
 * This implementation is suitable for:
 * - Development/testing
 * - Traditional server deployments (non-serverless)
 * - As a basic fallback layer
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

const PRESETS = {
  /** Standard API routes: 60 requests per minute */
  standard: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Expensive operations (AI, PDF): 10 requests per minute */
  expensive: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Data export routes: 5 requests per minute */
  export: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Auth-related: 20 requests per minute */
  auth: { maxRequests: 20, windowSeconds: 60 } as RateLimitConfig,
} as const;

export type RateLimitPreset = keyof typeof PRESETS;

/**
 * Lazy cleanup: Remove expired entries to keep Map size bounded.
 * Called periodically during check() to avoid setInterval resource leaks.
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL = 60_000; // Clean every 60 seconds

/**
 * In-memory rate limiter for API routes.
 *
 * Usage:
 * ```ts
 * const limiter = rateLimit('expensive');
 *
 * export async function POST(req: Request) {
 *   const limited = limiter.check(req);
 *   if (limited) return limited;
 *   // ... handle request
 * }
 * ```
 */
export function rateLimit(preset: RateLimitPreset | RateLimitConfig = 'standard') {
  const config = typeof preset === 'string' ? PRESETS[preset] : preset;

  return {
    check(req: Request): NextResponse | null {
      // Lazy cleanup: run periodically to avoid setInterval resource leaks
      const now = Date.now();
      if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        cleanupExpiredEntries();
        lastCleanupTime = now;
      }
      
      // ⚠️ IP SPOOFING WARNING: x-forwarded-for can be spoofed by clients
      // For Vercel deployments, use x-real-ip or Vercel's platform headers instead
      // TODO: Replace with more secure IP identification for production
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip'); // More reliable on Vercel
      const ip = realIp || forwarded?.split(',')[0]?.trim();
      
      // ⚠️ SECURITY ISSUE: Never use a shared fallback for rate limiting
      // If IP cannot be determined, reject the request instead of allowing
      // unlimited requests from the same 'unknown' bucket
      if (!ip) {
        return NextResponse.json(
          { error: 'Unable to determine client IP for rate limiting' },
          { status: 400 }
        );
      }
      
      const url = new URL(req.url);
      const key = `${ip}:${url.pathname}`;

      const entry = rateLimitStore.get(key);

      // Lazy cleanup: remove expired entry for this specific key
      if (entry && now > entry.resetTime) {
        rateLimitStore.delete(key);
      }

      const freshEntry = rateLimitStore.get(key);

      if (!freshEntry) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowSeconds * 1000,
        });
        return null;
      }

      freshEntry.count++;

      if (freshEntry.count > config.maxRequests) {
        const retryAfter = Math.ceil((freshEntry.resetTime - now) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(freshEntry.resetTime).toISOString(),
            },
          }
        );
      }

      return null;
    },
  };
}
