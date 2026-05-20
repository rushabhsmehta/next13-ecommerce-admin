import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, any> | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NotificationsResponse {
  notifications: AdminNotification[];
  unreadCount: number;
}

export interface NotificationsListFilters {
  unreadOnly?: boolean;
  limit?: number;
}

export function createNotificationsClient(authRequest: AuthenticatedRequest) {
  return {
    list(filters: NotificationsListFilters = {}): Promise<NotificationsResponse> {
      const qs = new URLSearchParams();
      if (filters.unreadOnly) qs.set("unreadOnly", "true");
      if (filters.limit) qs.set("limit", String(filters.limit));
      const raw = qs.toString();
      return authRequest<NotificationsResponse>(
        `/api/mobile/notifications${raw ? `?${raw}` : ""}`,
        { retries: 1 }
      );
    },

    markRead(id: string, read: boolean): Promise<AdminNotification> {
      return authRequest<AdminNotification>(
        `/api/mobile/notifications/${encodeURIComponent(id)}`,
        { method: "PATCH", body: { read } }
      );
    },

    markAllRead(): Promise<{ markedAsRead: number }> {
      return authRequest<{ markedAsRead: number }>(
        "/api/mobile/notifications/mark-all-read",
        { method: "POST", body: {} }
      );
    },

    delete(id: string): Promise<{ success: boolean; id: string }> {
      return authRequest<{ success: boolean; id: string }>(
        `/api/mobile/notifications/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    },
  };
}

export type NotificationsClient = ReturnType<typeof createNotificationsClient>;
