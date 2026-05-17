import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface TravelAdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
  chatGroupCount: number;
  messageCount: number;
  activePushTokenCount: number;
}

export interface TravelAdminChatMember {
  id: string;
  travelAppUserId: string;
  role: string;
  user: { id: string; name: string; email: string; phone?: string | null; isApproved: boolean };
}

export interface TravelAdminChatGroup {
  id: string;
  name: string;
  description?: string | null;
  tourPackageQueryId?: string | null;
  tourStartDate?: string | null;
  tourEndDate?: string | null;
  isActive: boolean;
  messageCount: number;
  members: TravelAdminChatMember[];
}

export interface TravelAdminOverview {
  users: TravelAdminUser[];
  chatGroups: TravelAdminChatGroup[];
  mobileAccess: {
    adminTokens: { id: string; userId: string; userName?: string | null; hasPushToken: boolean; updatedAt: string }[];
    mobileTokenCount: number;
    activeMobileTokenCount: number;
  };
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createTravelAppAdminClient(authRequest: AuthenticatedRequest) {
  return {
    getOverview(): Promise<TravelAdminOverview> {
      return authRequest<TravelAdminOverview>("/api/mobile/travel-app-admin/overview", {
        retries: 1,
      });
    },

    createUser(input: { name: string; email: string; phone?: string | null; isApproved?: boolean }) {
      return authRequest("/api/mobile/travel-app-admin/users", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("travel-user-create") },
      });
    },

    updateUser(id: string, input: { name?: string; phone?: string | null; isApproved?: boolean; isActive?: boolean }) {
      return authRequest(`/api/mobile/travel-app-admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("travel-user-update") },
      });
    },

    createChatGroup(input: {
      name: string;
      description?: string | null;
      tourPackageQueryId?: string | null;
      tourStartDate?: string | null;
      tourEndDate?: string | null;
      memberIds?: { userId: string; role?: string }[];
    }) {
      return authRequest("/api/mobile/travel-app-admin/chat-groups", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("chat-group-create") },
      });
    },

    updateChatGroup(id: string, input: { isActive?: boolean; name?: string; description?: string | null }) {
      return authRequest(`/api/mobile/travel-app-admin/chat-groups/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("chat-group-update") },
      });
    },

    addMember(groupId: string, input: { travelAppUserId: string; role: string }) {
      return authRequest(`/api/mobile/travel-app-admin/chat-groups/${encodeURIComponent(groupId)}/members`, {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("chat-member-add") },
      });
    },

    removeMember(groupId: string, travelAppUserId: string) {
      return authRequest(
        `/api/mobile/travel-app-admin/chat-groups/${encodeURIComponent(groupId)}/members?travelAppUserId=${encodeURIComponent(travelAppUserId)}`,
        {
          method: "DELETE",
          headers: { "Idempotency-Key": makeIdempotencyKey("chat-member-remove") },
        }
      );
    },
  };
}

export type TravelAppAdminClient = ReturnType<typeof createTravelAppAdminClient>;

