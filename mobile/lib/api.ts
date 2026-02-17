import { API_BASE_URL } from "@/constants/api";

// Lightweight API client for the mobile app
// Connects to the same Next.js backend that powers the admin CRM

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: any;
  token?: string | null;
};

async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// ========== Travel App (Public) APIs ==========

export const travelApi = {
  // Get featured packages for homepage
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

  // Get destinations
  getDestinations: () => request("/api/travel/destinations"),

  // Search packages and destinations
  search: (query: string) =>
    request(`/api/travel/search?q=${encodeURIComponent(query)}`),

  // Get package details by slug
  getPackageBySlug: (slug: string) =>
    request(`/api/tourPackageBySlug/${slug}`),
};

// ========== Chat APIs (Authenticated) ==========

export const chatApi = {
  // Get current user profile
  getMe: (token: string) => request("/api/chat/me", { token }),

  // Get user's chat groups
  getGroups: (token: string) => request("/api/chat/groups", { token }),

  // Get messages for a group
  getMessages: (groupId: string, token: string, cursor?: string) => {
    const qs = cursor ? `?cursor=${cursor}` : "";
    return request(`/api/chat/groups/${groupId}/messages${qs}`, { token });
  },

  // Send a message
  sendMessage: (
    groupId: string,
    message: {
      messageType?: string;
      content?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      latitude?: number;
      longitude?: number;
      contactName?: string;
      contactPhone?: string;
      tourPackageId?: string;
    },
    token: string
  ) =>
    request(`/api/chat/groups/${groupId}/messages`, {
      method: "POST",
      body: message,
      token,
    }),

  // Get group members
  getMembers: (groupId: string, token: string) =>
    request(`/api/chat/groups/${groupId}/members`, { token }),
};

// ========== Push Notification APIs ==========

export const pushApi = {
  subscribe: (subscription: any, token: string) =>
    request("/api/push/subscribe", {
      method: "POST",
      body: subscription,
      token,
    }),

  unsubscribe: (endpoint: string, token: string) =>
    request("/api/push/subscribe", {
      method: "DELETE",
      body: { endpoint },
      token,
    }),
};
