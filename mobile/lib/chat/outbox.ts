import { getDb } from "../cache";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const MAX_ATTEMPTS = 5;

export type OutboxStatus = "pending" | "sending" | "failed" | "sent";

export interface OutboxPayload {
  messageType: string;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  tourPackageId?: string | null;
  replyToId?: string | null;
  isAnnouncement?: boolean;
  isPinned?: boolean;
  isImportant?: boolean;
}

export interface OutboxEntry {
  clientId: string;
  groupId: string;
  payload: OutboxPayload;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}

function rowToEntry(row: {
  client_id: string;
  group_id: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: number;
}): OutboxEntry | null {
  try {
    return {
      clientId: row.client_id,
      groupId: row.group_id,
      payload: JSON.parse(row.payload) as OutboxPayload,
      status: row.status as OutboxStatus,
      attempts: row.attempts,
      lastError: row.last_error ?? null,
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}

export const chatOutbox = {
  async enqueue(groupId: string, payload: OutboxPayload, clientId?: string): Promise<OutboxEntry> {
    const id = clientId ?? `out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO chat_outbox
         (client_id, group_id, payload, status, attempts, last_error, created_at)
         VALUES (?, ?, ?, 'pending', 0, NULL, ?)`,
        [id, groupId, JSON.stringify(payload), createdAt]
      );
    } catch {}
    return {
      clientId: id,
      groupId,
      payload,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt,
    };
  },

  async list(groupId?: string): Promise<OutboxEntry[]> {
    try {
      const db = await getDb();
      const rows = groupId
        ? await db.getAllAsync<any>(
            "SELECT * FROM chat_outbox WHERE group_id = ? ORDER BY created_at ASC",
            [groupId]
          )
        : await db.getAllAsync<any>(
            "SELECT * FROM chat_outbox ORDER BY created_at ASC"
          );
      return rows.map(rowToEntry).filter((e): e is OutboxEntry => e !== null);
    } catch {
      return [];
    }
  },

  async pending(groupId?: string): Promise<OutboxEntry[]> {
    try {
      const db = await getDb();
      const rows = groupId
        ? await db.getAllAsync<any>(
            "SELECT * FROM chat_outbox WHERE group_id = ? AND status IN ('pending','failed') ORDER BY created_at ASC",
            [groupId]
          )
        : await db.getAllAsync<any>(
            "SELECT * FROM chat_outbox WHERE status IN ('pending','failed') ORDER BY created_at ASC"
          );
      return rows.map(rowToEntry).filter((e): e is OutboxEntry => e !== null);
    } catch {
      return [];
    }
  },

  async markStatus(clientId: string, status: OutboxStatus, lastError?: string | null): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE chat_outbox SET status = ?, last_error = ? WHERE client_id = ?",
        [status, lastError ?? null, clientId]
      );
    } catch {}
  },

  async incrementAttempts(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE chat_outbox SET attempts = attempts + 1 WHERE client_id = ?",
        [clientId]
      );
    } catch {}
  },

  async remove(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM chat_outbox WHERE client_id = ?", [clientId]);
    } catch {}
  },

  async retry(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE chat_outbox SET status = 'pending', last_error = NULL WHERE client_id = ?",
        [clientId]
      );
    } catch {}
  },

  /**
   * Send all pending entries for the given group (or all groups if not specified).
   * Returns the list of clientIds that succeeded so callers can reconcile UI state.
   */
  async flush(opts: {
    groupId?: string;
    getToken: () => Promise<string | null>;
  }): Promise<{ sentClientIds: string[]; failedClientIds: string[] }> {
    const sent: string[] = [];
    const failed: string[] = [];
    const entries = await this.pending(opts.groupId);
    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        await this.markStatus(entry.clientId, "failed", "max attempts reached");
        failed.push(entry.clientId);
        continue;
      }
      await this.markStatus(entry.clientId, "sending");
      await this.incrementAttempts(entry.clientId);
      try {
        const jwt = await opts.getToken();
        const res = await fetch(
          `${API_BASE_URL}/api/chat/groups/${entry.groupId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify(entry.payload),
          }
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          await this.markStatus(entry.clientId, "failed", `HTTP ${res.status}: ${txt.slice(0, 200)}`);
          failed.push(entry.clientId);
          continue;
        }
        await this.remove(entry.clientId);
        sent.push(entry.clientId);
      } catch (err: any) {
        await this.markStatus(entry.clientId, "failed", err?.message ?? "network error");
        failed.push(entry.clientId);
      }
    }
    return { sentClientIds: sent, failedClientIds: failed };
  },
};
