import { getDb } from "@/lib/cache";
import type { WaMessage } from "@/components/whatsapp/MessageBubble";

const MAX_CACHED_PER_PHONE = 200;

export interface PhoneState {
  phone: string;
  lastSeenMessageId: string | null;
  unreadCount: number;
}

function normalizePhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export const whatsappCache = {
  async loadMessages(phone: string, limit = 100): Promise<WaMessage[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM wa_messages WHERE phone = ? ORDER BY created_at DESC LIMIT ?",
        [normalizePhone(phone), limit],
      );
      const msgs = rows
        .map((r) => {
          try {
            return JSON.parse(r.payload) as WaMessage;
          } catch {
            return null;
          }
        })
        .filter((m): m is WaMessage => m !== null);
      // Reverse so chronological order (oldest first) feeds the FlatList.
      return msgs.reverse();
    } catch {
      return [];
    }
  },

  async upsertMessages(phone: string, messages: WaMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const norm = normalizePhone(phone);
    try {
      const db = await getDb();
      for (const m of messages) {
        const createdAt = new Date(m.createdAt).getTime();
        if (Number.isNaN(createdAt)) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO wa_messages
           (phone, message_id, direction, payload, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            norm,
            m.id,
            m.direction,
            JSON.stringify(m),
            createdAt,
          ],
        );
      }
      await db.runAsync(
        `DELETE FROM wa_messages
         WHERE phone = ?
           AND message_id NOT IN (
             SELECT message_id FROM wa_messages
              WHERE phone = ?
              ORDER BY created_at DESC
              LIMIT ?
           )`,
        [norm, norm, MAX_CACHED_PER_PHONE],
      );
    } catch {
      /* best-effort cache */
    }
  },

  async removeMessage(phone: string, messageId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "DELETE FROM wa_messages WHERE phone = ? AND message_id = ?",
        [normalizePhone(phone), messageId],
      );
    } catch {}
  },

  async clearPhone(phone: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM wa_messages WHERE phone = ?", [
        normalizePhone(phone),
      ]);
    } catch {}
  },

  async getPhoneState(phone: string): Promise<PhoneState> {
    const norm = normalizePhone(phone);
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{
        last_seen_message_id: string | null;
        unread_count: number;
      }>(
        "SELECT last_seen_message_id, unread_count FROM wa_phone_state WHERE phone = ?",
        [norm],
      );
      return {
        phone: norm,
        lastSeenMessageId: row?.last_seen_message_id ?? null,
        unreadCount: row?.unread_count ?? 0,
      };
    } catch {
      return { phone: norm, lastSeenMessageId: null, unreadCount: 0 };
    }
  },

  async setLastSeen(
    phone: string,
    messageId: string | null,
    unreadCount = 0,
  ): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO wa_phone_state (phone, last_seen_message_id, unread_count, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(phone) DO UPDATE SET
           last_seen_message_id = excluded.last_seen_message_id,
           unread_count = excluded.unread_count,
           updated_at = excluded.updated_at`,
        [normalizePhone(phone), messageId, unreadCount, Date.now()],
      );
    } catch {}
  },

  async setUnread(phone: string, unreadCount: number): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO wa_phone_state (phone, last_seen_message_id, unread_count, updated_at)
         VALUES (?, NULL, ?, ?)
         ON CONFLICT(phone) DO UPDATE SET
           unread_count = excluded.unread_count,
           updated_at = excluded.updated_at`,
        [normalizePhone(phone), unreadCount, Date.now()],
      );
    } catch {}
  },
};
