import { getDb } from "@/lib/cache";
import { API_BASE_URL } from "@/constants/api";
import { mobileAppVariantHeaders } from "@/lib/app-variant";

const MAX_ATTEMPTS = 5;

export type OutboxStatus = "pending" | "sending" | "failed" | "sent";

export type OutboxBodyType = "text" | "image" | "video" | "audio" | "document" | "template";

export interface OutboxPayload {
  type: OutboxBodyType;
  message?: string | null;
  templateName?: string | null;
  parameters?: unknown[];
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  caption?: string | null;
  filename?: string | null;
  replyToWamid?: string | null;
}

export interface OutboxEntry {
  clientId: string;
  phone: string;
  payload: OutboxPayload;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}

interface RawRow {
  client_id: string;
  phone: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: number;
}

function rowToEntry(row: RawRow): OutboxEntry | null {
  try {
    return {
      clientId: row.client_id,
      phone: row.phone,
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

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export const whatsappOutbox = {
  async enqueue(
    phone: string,
    payload: OutboxPayload,
    clientId?: string,
  ): Promise<OutboxEntry> {
    const id = clientId ?? `wa-out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    const norm = normalizePhone(phone);
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO wa_outbox
         (client_id, phone, payload, status, attempts, last_error, created_at)
         VALUES (?, ?, ?, 'pending', 0, NULL, ?)`,
        [id, norm, JSON.stringify(payload), createdAt],
      );
    } catch {}
    return {
      clientId: id,
      phone: norm,
      payload,
      status: "pending",
      attempts: 0,
      lastError: null,
      createdAt,
    };
  },

  async list(phone?: string): Promise<OutboxEntry[]> {
    try {
      const db = await getDb();
      const rows = phone
        ? await db.getAllAsync<RawRow>(
            "SELECT * FROM wa_outbox WHERE phone = ? ORDER BY created_at ASC",
            [normalizePhone(phone)],
          )
        : await db.getAllAsync<RawRow>(
            "SELECT * FROM wa_outbox ORDER BY created_at ASC",
          );
      return rows.map(rowToEntry).filter((e): e is OutboxEntry => e !== null);
    } catch {
      return [];
    }
  },

  async pending(phone?: string): Promise<OutboxEntry[]> {
    try {
      const db = await getDb();
      // 'sending' is included so a row left mid-flight by an app crash or
      // unhandled error is picked up on the next flush. flush() always
      // re-marks the row to 'sending' before dispatching, so this is
      // idempotent — duplicate sends are bounded by attempts < MAX_ATTEMPTS.
      const rows = phone
        ? await db.getAllAsync<RawRow>(
            "SELECT * FROM wa_outbox WHERE phone = ? AND status IN ('pending','failed','sending') ORDER BY created_at ASC",
            [normalizePhone(phone)],
          )
        : await db.getAllAsync<RawRow>(
            "SELECT * FROM wa_outbox WHERE status IN ('pending','failed','sending') ORDER BY created_at ASC",
          );
      return rows.map(rowToEntry).filter((e): e is OutboxEntry => e !== null);
    } catch {
      return [];
    }
  },

  async markStatus(
    clientId: string,
    status: OutboxStatus,
    lastError?: string | null,
  ): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE wa_outbox SET status = ?, last_error = ? WHERE client_id = ?",
        [status, lastError ?? null, clientId],
      );
    } catch {}
  },

  async incrementAttempts(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE wa_outbox SET attempts = attempts + 1 WHERE client_id = ?",
        [clientId],
      );
    } catch {}
  },

  async remove(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM wa_outbox WHERE client_id = ?", [
        clientId,
      ]);
    } catch {}
  },

  async retry(clientId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "UPDATE wa_outbox SET status = 'pending', last_error = NULL WHERE client_id = ?",
        [clientId],
      );
    } catch {}
  },

  /**
   * Drain pending entries for the given phone (or all phones). Each entry hits
   * /api/mobile/whatsapp/send. Caller can refetch the thread once flush
   * completes to reconcile UI with server state.
   */
  async flush(opts: {
    phone?: string;
    getToken: () => Promise<string | null>;
  }): Promise<{ sentClientIds: string[]; failedClientIds: string[] }> {
    const sent: string[] = [];
    const failed: string[] = [];
    const entries = await this.pending(opts.phone);
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
        const res = await fetch(`${API_BASE_URL}/api/mobile/whatsapp/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            ...mobileAppVariantHeaders(),
          },
          body: JSON.stringify({ phone: entry.phone, ...entry.payload }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          await this.markStatus(
            entry.clientId,
            "failed",
            `HTTP ${res.status}: ${txt.slice(0, 200)}`,
          );
          failed.push(entry.clientId);
          continue;
        }
        await this.remove(entry.clientId);
        sent.push(entry.clientId);
      } catch (err: any) {
        await this.markStatus(
          entry.clientId,
          "failed",
          err?.message ?? "network error",
        );
        failed.push(entry.clientId);
      }
    }
    return { sentClientIds: sent, failedClientIds: failed };
  },
};
