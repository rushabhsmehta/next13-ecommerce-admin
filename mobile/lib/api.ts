import { API_BASE_URL } from "@/constants/api";

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number | null,
    public retryable: boolean = false,
    public code?: string
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
};

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
    timeout = DEFAULT_TIMEOUT,
    retries = MAX_RETRIES,
    headers: customHeaders,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
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
          errorData.code
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
}

function withAuth(tokenProvider: () => Promise<string | null>) {
  return async function authRequest<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = await tokenProvider();
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
    return request(`/api/travel/packages${qs ? `?${qs}` : ""}`);
  },

  getDestinations: () => request("/api/travel/destinations"),

  search: (query: string) =>
    request(`/api/travel/search?q=${encodeURIComponent(query)}`),

  getPackageBySlug: (slug: string) =>
    request(`/api/tourPackageBySlug/${slug}`),
};