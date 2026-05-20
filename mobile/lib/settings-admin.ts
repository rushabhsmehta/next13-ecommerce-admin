import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type SettingsMasterKind =
  | "units"
  | "tax-slabs"
  | "meal-plans"
  | "room-types"
  | "occupancy-types"
  | "vehicle-types"
  | "pricing-attributes"
  | "pricing-components"
  | "tds-sections"
  | "income-categories"
  | "expense-categories";

export interface SettingsSummary {
  organization: Record<string, any> | null;
  masters: Record<string, any[]>;
  auditLogs: Record<string, any>[];
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function qsFrom(filters: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && String(value).trim() !== "") qs.set(key, String(value));
  }
  const raw = qs.toString();
  return raw ? `?${raw}` : "";
}

export function createSettingsAdminClient(authRequest: AuthenticatedRequest) {
  return {
    getSummary(auditSearch?: string): Promise<SettingsSummary> {
      return authRequest<SettingsSummary>(
        `/api/mobile/settings/summary${qsFrom({ auditSearch })}`,
        { retries: 1 }
      );
    },

    updateOrganization(input: Record<string, any>) {
      return authRequest("/api/mobile/settings/organization", {
        method: "PATCH",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("settings-org-update") },
      });
    },

    createMaster(kind: SettingsMasterKind, input: Record<string, any>) {
      return authRequest(`/api/mobile/settings/masters/${kind}`, {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey(`settings-${kind}-create`) },
      });
    },

    updateMaster(kind: SettingsMasterKind, id: string, input: Record<string, any>) {
      return authRequest(`/api/mobile/settings/masters/${kind}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey(`settings-${kind}-update`) },
      });
    },

    deleteMaster(kind: SettingsMasterKind, id: string) {
      return authRequest(`/api/mobile/settings/masters/${kind}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Idempotency-Key": makeIdempotencyKey(`settings-${kind}-delete`) },
      });
    },

    searchAuditLogs(search: string) {
      return authRequest(`/api/mobile/settings/audit-logs${qsFrom({ search, limit: 50 })}`, {
        retries: 1,
      });
    },
  };
}

export type SettingsAdminClient = ReturnType<typeof createSettingsAdminClient>;

