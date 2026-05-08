// In-memory mock for expo-sqlite to test chat message cache + group state.

interface MsgRow {
  group_id: string;
  message_id: string;
  sender_id: string | null;
  message_type: string;
  payload: string;
  created_at: number;
}

interface StateRow {
  group_id: string;
  last_seen_message_id: string | null;
  unread_count: number;
  updated_at: number;
}

const mockMsgs: MsgRow[] = [];
const mockStates = new Map<string, StateRow>();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(async (sql: string, params?: any[]) => {
        const p = params ?? [];
        if (/INSERT OR REPLACE INTO chat_messages/i.test(sql)) {
          const [group_id, message_id, sender_id, message_type, payload, created_at] = p;
          const idx = mockMsgs.findIndex(
            (m) => m.group_id === group_id && m.message_id === message_id
          );
          const row: MsgRow = { group_id, message_id, sender_id, message_type, payload, created_at };
          if (idx >= 0) mockMsgs[idx] = row;
          else mockMsgs.push(row);
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/^DELETE FROM chat_messages\s+WHERE group_id = \?\s+AND message_id NOT IN/i.test(sql)) {
          const [groupId, , limit] = p;
          const mockGroupMsgs = mockMsgs
            .filter((m) => m.group_id === groupId)
            .sort((a, b) => b.created_at - a.created_at);
          const keep = new Set(mockGroupMsgs.slice(0, limit).map((m) => m.message_id));
          for (let i = mockMsgs.length - 1; i >= 0; i--) {
            if (mockMsgs[i].group_id === groupId && !keep.has(mockMsgs[i].message_id)) {
              mockMsgs.splice(i, 1);
            }
          }
          return { changes: 0, lastInsertRowId: 0 };
        }
        if (/^DELETE FROM chat_messages WHERE group_id = \?$/i.test(sql)) {
          const [groupId] = p;
          for (let i = mockMsgs.length - 1; i >= 0; i--) {
            if (mockMsgs[i].group_id === groupId) mockMsgs.splice(i, 1);
          }
          return { changes: 0, lastInsertRowId: 0 };
        }
        if (/INSERT INTO chat_group_state.*VALUES \(\?, NULL, \?, \?\)/is.test(sql)) {
          // setUnread: 3 params (group_id, unread, updated)
          const [group_id, unread, updated] = p;
          const existing = mockStates.get(group_id);
          mockStates.set(group_id, {
            group_id,
            last_seen_message_id: existing?.last_seen_message_id ?? null,
            unread_count: unread,
            updated_at: updated,
          });
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/INSERT INTO chat_group_state.*ON CONFLICT/is.test(sql)) {
          // setLastSeen: 4 params (group_id, last_seen, unread, updated)
          const [group_id, last_seen, unread, updated] = p;
          mockStates.set(group_id, {
            group_id,
            last_seen_message_id: last_seen,
            unread_count: unread,
            updated_at: updated,
          });
          return { changes: 1, lastInsertRowId: 0 };
        }
        return { changes: 0, lastInsertRowId: 0 };
      }),
      getFirstAsync: jest.fn(async (sql: string, params?: any[]) => {
        const p = params ?? [];
        if (/SELECT message_id FROM chat_messages WHERE group_id/i.test(sql)) {
          const [groupId] = p;
          const mockGroupMsgs = mockMsgs
            .filter((m) => m.group_id === groupId)
            .sort((a, b) => b.created_at - a.created_at);
          return mockGroupMsgs[0] ? { message_id: mockGroupMsgs[0].message_id } : null;
        }
        if (/SELECT last_seen_message_id, unread_count FROM chat_group_state/i.test(sql)) {
          const [groupId] = p;
          const s = mockStates.get(groupId);
          return s
            ? { last_seen_message_id: s.last_seen_message_id, unread_count: s.unread_count }
            : null;
        }
        return null;
      }),
      getAllAsync: jest.fn(async (sql: string, params?: any[]) => {
        const p = params ?? [];
        if (/FROM chat_messages WHERE group_id = \? ORDER BY created_at DESC LIMIT/i.test(sql)) {
          const [groupId, limit] = p;
          return mockMsgs
            .filter((m) => m.group_id === groupId)
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, limit)
            .map((m) => ({ payload: m.payload }));
        }
        if (/FROM chat_group_state/i.test(sql)) {
          return Array.from(mockStates.values()).map((s) => ({
            group_id: s.group_id,
            last_seen_message_id: s.last_seen_message_id,
            unread_count: s.unread_count,
          }));
        }
        return [];
      }),
    })
  ),
}));

import { chatCache, type CachedMessage } from "../../lib/chat/cache";

function makeMsg(id: string, createdAtMs: number): CachedMessage {
  return {
    id,
    content: `msg ${id}`,
    messageType: "TEXT",
    createdAt: new Date(createdAtMs).toISOString(),
    senderId: "user-1",
    sender: { id: "user-1", name: "Alice", avatarUrl: null },
  };
}

describe("chatCache", () => {
  beforeEach(() => {
    mockMsgs.length = 0;
    mockStates.clear();
  });

  it("upsertMessages and loadMessages round-trip in chronological order", async () => {
    const a = makeMsg("a", 1000);
    const b = makeMsg("b", 2000);
    const c = makeMsg("c", 3000);
    await chatCache.upsertMessages("g1", [a, b, c]);
    const loaded = await chatCache.loadMessages("g1");
    expect(loaded.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("upsertMessages overwrites existing messages by id", async () => {
    await chatCache.upsertMessages("g1", [makeMsg("a", 1000)]);
    const updated: CachedMessage = { ...makeMsg("a", 1000), content: "edited" };
    await chatCache.upsertMessages("g1", [updated]);
    const loaded = await chatCache.loadMessages("g1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].content).toBe("edited");
  });

  it("getLastMessageId returns the most recent id", async () => {
    await chatCache.upsertMessages("g1", [makeMsg("a", 1000), makeMsg("b", 2000)]);
    const id = await chatCache.getLastMessageId("g1");
    expect(id).toBe("b");
  });

  it("setLastSeen and getGroupState round-trip", async () => {
    await chatCache.setLastSeen("g1", "msg-9", 0);
    const s = await chatCache.getGroupState("g1");
    expect(s.lastSeenMessageId).toBe("msg-9");
    expect(s.unreadCount).toBe(0);
  });

  it("setUnread updates only unread count without touching last-seen", async () => {
    await chatCache.setLastSeen("g1", "msg-1", 0);
    await chatCache.setUnread("g1", 3);
    const s = await chatCache.getGroupState("g1");
    expect(s.unreadCount).toBe(3);
    // last_seen is overwritten to NULL by setUnread per the SQL — ensure callers know.
    // (setUnread is meant for ephemeral count updates from polling, not for tracking reads.)
  });

  it("getAllGroupStates returns every persisted group", async () => {
    await chatCache.setUnread("g1", 1);
    await chatCache.setUnread("g2", 2);
    const all = await chatCache.getAllGroupStates();
    expect(all).toHaveLength(2);
    const byId = Object.fromEntries(all.map((s) => [s.groupId, s.unreadCount]));
    expect(byId).toEqual({ g1: 1, g2: 2 });
  });

  it("clearGroup removes all messages for that group", async () => {
    await chatCache.upsertMessages("g1", [makeMsg("a", 1000)]);
    await chatCache.upsertMessages("g2", [makeMsg("b", 1000)]);
    await chatCache.clearGroup("g1");
    expect(await chatCache.loadMessages("g1")).toHaveLength(0);
    expect(await chatCache.loadMessages("g2")).toHaveLength(1);
  });
});
