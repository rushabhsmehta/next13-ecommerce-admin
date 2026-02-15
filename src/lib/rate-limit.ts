import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000); // Clean every minute

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
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
      const url = new URL(req.url);
      const key = `${ip}:${url.pathname}`;

      const now = Date.now();
      const entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowSeconds * 1000,
        });
        return null;
      }

      entry.count++;

      if (entry.count > config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            },
          }
        );
      }

      return null;
    },
  };
}
