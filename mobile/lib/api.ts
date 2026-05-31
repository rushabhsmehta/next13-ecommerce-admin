import { API_BASE_URL } from "@/constants/api";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { resolveMobileAuthToken } from "@/lib/resolve-auth-token";
import { mobileAppVariantHeaders } from "@/lib/app-variant";

const DEFAULT_TIMEOUT = 10000;
// Writes (POST/PATCH/PUT/DELETE) can trigger heavy server work — e.g. tour-query
// saves that rebuild variant snapshots inside a 40s DB transaction. A short client
// timeout aborts those mid-flight and surfaces a false "Request timed out" even
// though the server may still commit. Give writes a budget that matches the
// server's transaction ceiling. Writes still default to 0 retries (below) so a
// slow-but-successful write is never duplicated by a retry.
const WRITE_TIMEOUT = 30000;
/** PATCH/POST tour-query routes (variant snapshots + itinerary writes). */
export const TOUR_QUERY_WRITE_TIMEOUT = 90000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number | null,
    public retryable: boolean = false,
    public code?: string,
    /** Extra JSON from API (e.g. Zod `flatten()` on validation errors). */
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: any;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  cacheKey?: string;
  cacheTtlSeconds?: number;
  dedupe?: boolean;
  staleOnError?: boolean;
  /**
   * When true, fail fast with a non-retryable `OFFLINE` ApiError if the
   * device is offline. Used by `online_only` modules (finance, exports,
   * settings) to prevent silent retries against a dead network.
   * The check is delegated through a registered callback so this module
   * stays free of an `expo-network` import (kept lean for tests).
   */
  requireOnline?: boolean;
};

type OfflineChecker = () => Promise<boolean>;
let registeredOfflineChecker: OfflineChecker | null = null;
const memoryGetCache = new Map<string, { value: unknown; expiresAt: number }>();
const inFlightGets = new Map<string, Promise<unknown>>();

/**
 * Register a function that resolves to `true` when the device is offline.
 * Called by `NetworkProvider` on mount so the API client can hard-block
 * writes flagged `requireOnline` without coupling to expo-network here.
 */
export function setOfflineChecker(checker: OfflineChecker | null) {
  registeredOfflineChecker = checker;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    timeout: timeoutOption,
    retries: retriesOption,
    headers: customHeaders,
    idempotencyKey,
    signal,
    cacheKey: explicitCacheKey,
    cacheTtlSeconds = 0,
    dedupe = false,
    staleOnError = false,
    requireOnline = false,
  } = options;

  const isWrite = method !== "GET";
  const timeout = timeoutOption ?? (isWrite ? WRITE_TIMEOUT : DEFAULT_TIMEOUT);
  const retries = retriesOption ?? (method === "GET" ? MAX_RETRIES : 0);

  if (requireOnline && registeredOfflineChecker) {
    const offline = await registeredOfflineChecker();
    if (offline) {
      throw new ApiError(
        "You appear to be offline. Reconnect to continue.",
        null,
        false,
        "OFFLINE"
      );
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...mobileAppVariantHeaders(),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...customHeaders,
  };

  const shouldUseReadCache = method === "GET" && (cacheTtlSeconds > 0 || dedupe);
  const readCacheKey = shouldUseReadCache
    ? explicitCacheKey ?? `${headers.Authorization ? "auth" : "anon"}:${endpoint}`
    : null;

  if (readCacheKey && cacheTtlSeconds > 0) {
    const cached = memoryGetCache.get(readCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }
  }

  if (readCacheKey && dedupe) {
    const pending = inFlightGets.get(readCacheKey);
    if (pending) return pending as Promise<T>;
  }

  const executeNetwork = async (): Promise<T> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: signal ?? controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const retryable =
            res.status >= 500 || res.status === 429 || res.status === 0;
          throw new ApiError(
            errorData.error || `Request failed with status ${res.status}`,
            res.status,
            retryable,
            errorData.code,
            errorData.details
          );
        }

        return res.json();
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error instanceof ApiError) {
          if (error.retryable && attempt < retries) {
            lastError = error;
            await sleep(RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]);
            continue;
          }
          throw error;
        }

        if (error.name === "AbortError") {
          const apiError = new ApiError("Request timed out", null, true, "TIMEOUT");
          if (attempt < retries) {
            lastError = apiError;
            await sleep(RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]);
            continue;
          }
          throw apiError;
        }

        const apiError = new ApiError(
          error.message || "Network error",
          null,
          true,
          "NETWORK_ERROR"
        );
        if (attempt < retries) {
          lastError = apiError;
          await sleep(RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]);
          continue;
        }
        throw apiError;
      }
    }

    throw lastError || new ApiError("Max retries exceeded", null, true);
  };

  const networkPromise = executeNetwork();
  if (readCacheKey && dedupe) inFlightGets.set(readCacheKey, networkPromise);

  try {
    const data = await networkPromise;
    if (readCacheKey && cacheTtlSeconds > 0) {
      memoryGetCache.set(readCacheKey, {
        value: data,
        expiresAt: Date.now() + cacheTtlSeconds * 1000,
      });
    }
    return data;
  } catch (error) {
    if (readCacheKey && staleOnError) {
      const stale = memoryGetCache.get(readCacheKey);
      if (stale) return stale.value as T;
    }
    throw error;
  } finally {
    if (readCacheKey && dedupe) inFlightGets.delete(readCacheKey);
  }
}

async function cachedRequest<T = any>(
  key: string,
  endpoint: string,
  ttlSeconds: number,
  options: RequestOptions = {}
): Promise<T> {
  const fresh = await cache.get<T>(key);
  if (fresh) return fresh;
  try {
    const data = await request<T>(endpoint, options);
    await cache.set(key, data, ttlSeconds);
    return data;
  } catch (error) {
    const stale = await cache.getStale<T>(key);
    if (stale) return stale;
    throw error;
  }
}

function withAuth(tokenProvider: () => Promise<string | null>) {
  return async function authRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = await resolveMobileAuthToken(tokenProvider);
    if (!token) {
      throw new ApiError("Not authenticated", 401, false, "UNAUTHENTICATED");
    }
    return request<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };
}

export { request, withAuth };

export const travelApi = {
  getPackages: (params?: {
    locationId?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.locationId) searchParams.set("locationId", params.locationId);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const qs = searchParams.toString();
    const endpoint = `/api/travel/packages${qs ? `?${qs}` : ""}`;
    return cachedRequest(
      CACHE_KEYS.PACKAGES(Object.fromEntries(searchParams.entries())),
      endpoint,
      CACHE_TTL.PACKAGES
    );
  },

  getDestinations: () =>
    cachedRequest(CACHE_KEYS.DESTINATIONS, "/api/travel/destinations", CACHE_TTL.DESTINATIONS),

  search: (query: string) =>
    request(`/api/travel/search?q=${encodeURIComponent(query)}`),

  getPackageBySlug: (slug: string) =>
    cachedRequest(
      CACHE_KEYS.PACKAGE(slug),
      `/api/tourPackageBySlug/${slug}`,
      CACHE_TTL.PACKAGE
    ),
};
