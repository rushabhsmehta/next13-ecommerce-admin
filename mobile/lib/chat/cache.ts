import { getDb } from "../cache";

const MAX_CACHED_PER_GROUP = 200;

export interface CachedMessage {
  id: string;
  content: string | null;
  messageType: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; name: string; avatarUrl: string | null } | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GroupState {
  groupId: string;
  lastSeenMessageId: string | null;
  unreadCount: number;
}

function toIso(createdAt: number): string {
  return new Date(createdAt).toISOString();
}

export const chatCache = {
  async loadMessages(groupId: string, limit = 50): Promise<CachedMessage[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM chat_messages WHERE group_id = ? ORDER BY created_at DESC LIMIT ?",
        [groupId, limit]
      );
      const msgs = rows
        .map((r) => {
          try {
            return JSON.parse(r.payload) as CachedMessage;
          } catch {
            return null;
          }
        })
        .filter((m): m is CachedMessage => m !== null);
      // Reverse to chronological order (oldest first) for the FlatList
      return msgs.reverse();
    } catch {
      return [];
    }
  },

  async upsertMessages(groupId: string, messages: CachedMessage[]): Promise<void> {
    if (messages.length === 0) return;
    try {
      const db = await getDb();
      for (const m of messages) {
        const createdAt = new Date(m.createdAt).getTime();
        if (Number.isNaN(createdAt)) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO chat_messages
           (group_id, message_id, sender_id, message_type, payload, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [groupId, m.id, m.senderId ?? null, m.messageType ?? "TEXT", JSON.stringify(m), createdAt]
        );
      }
      // Trim to MAX_CACHED_PER_GROUP keeping the most recent.
      await db.runAsync(
        `DELETE FROM chat_messages
         WHERE group_id = ?
           AND message_id NOT IN (
             SELECT message_id FROM chat_messages
              WHERE group_id = ?
              ORDER BY created_at DESC
              LIMIT ?
           )`,
        [groupId, groupId, MAX_CACHED_PER_GROUP]
      );
    } catch {
      // best-effort cache
    }
  },

  async clearGroup(groupId: string): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync("DELETE FROM chat_messages WHERE group_id = ?", [groupId]);
    } catch {}
  },

  async getLastMessageId(groupId: string): Promise<string | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ message_id: string }>(
        "SELECT message_id FROM chat_messages WHERE group_id = ? ORDER BY created_at DESC LIMIT 1",
        [groupId]
      );
      return row?.message_id ?? null;
    } catch {
      return null;
    }
  },

  async getGroupState(groupId: string): Promise<GroupState> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{
        last_seen_message_id: string | null;
        unread_count: number;
      }>(
        "SELECT last_seen_message_id, unread_count FROM chat_group_state WHERE group_id = ?",
        [groupId]
      );
      return {
        groupId,
        lastSeenMessageId: row?.last_seen_message_id ?? null,
        unreadCount: row?.unread_count ?? 0,
      };
    } catch {
      return { groupId, lastSeenMessageId: null, unreadCount: 0 };
    }
  },

  async getAllGroupStates(): Promise<GroupState[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        group_id: string;
        last_seen_message_id: string | null;
        unread_count: number;
      }>(
        "SELECT group_id, last_seen_message_id, unread_count FROM chat_group_state"
      );
      return rows.map((r) => ({
        groupId: r.group_id,
        lastSeenMessageId: r.last_seen_message_id ?? null,
        unreadCount: r.unread_count ?? 0,
      }));
    } catch {
      return [];
    }
  },

  async setLastSeen(groupId: string, messageId: string | null, unreadCount = 0): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO chat_group_state (group_id, last_seen_message_id, unread_count, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET
           last_seen_message_id = excluded.last_seen_message_id,
           unread_count = excluded.unread_count,
           updated_at = excluded.updated_at`,
        [groupId, messageId, unreadCount, Date.now()]
      );
    } catch {}
  },

  async setUnread(groupId: string, unreadCount: number): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        `INSERT INTO chat_group_state (group_id, last_seen_message_id, unread_count, updated_at)
         VALUES (?, NULL, ?, ?)
         ON CONFLICT(group_id) DO UPDATE SET
           unread_count = excluded.unread_count,
           updated_at = excluded.updated_at`,
        [groupId, unreadCount, Date.now()]
      );
    } catch {}
  },
};
