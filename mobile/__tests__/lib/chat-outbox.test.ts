// In-memory mock for expo-sqlite so we can exercise outbox SQL end-to-end.
// Has to be set up before importing the modules under test.

interface Row {
  client_id: string;
  group_id: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: number;
}

const mockOutboxRows = new Map<string, Row>();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(async (sql: string, params?: any[]) => {
        const p = params ?? [];
        if (/INSERT OR REPLACE INTO chat_outbox/i.test(sql)) {
          const [client_id, group_id, payload, , , , created_at] = p;
          // status = 'pending', attempts = 0, last_error = NULL hardcoded in SQL
          mockOutboxRows.set(client_id, {
            client_id,
            group_id,
            payload,
            status: "pending",
            attempts: 0,
            last_error: null,
            created_at,
          });
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/^UPDATE chat_outbox SET status = \?, last_error = \?/i.test(sql)) {
          const [status, last_error, client_id] = p;
          const r = mockOutboxRows.get(client_id);
          if (r) mockOutboxRows.set(client_id, { ...r, status, last_error });
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/UPDATE chat_outbox SET attempts = attempts \+ 1/i.test(sql)) {
          const [client_id] = p;
          const r = mockOutboxRows.get(client_id);
          if (r) mockOutboxRows.set(client_id, { ...r, attempts: r.attempts + 1 });
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/UPDATE chat_outbox SET status = 'pending'/i.test(sql)) {
          const [client_id] = p;
          const r = mockOutboxRows.get(client_id);
          if (r) mockOutboxRows.set(client_id, { ...r, status: "pending", last_error: null });
          return { changes: 1, lastInsertRowId: 0 };
        }
        if (/^DELETE FROM chat_outbox WHERE client_id = \?/i.test(sql)) {
          mockOutboxRows.delete(p[0]);
          return { changes: 1, lastInsertRowId: 0 };
        }
        return { changes: 0, lastInsertRowId: 0 };
      }),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      getAllAsync: jest.fn(async (sql: string, params?: any[]) => {
        const p = params ?? [];
        const rows = Array.from(mockOutboxRows.values());
        if (/WHERE group_id = \? AND status IN \('pending','failed'\)/i.test(sql)) {
          return rows
            .filter((r) => r.group_id === p[0] && (r.status === "pending" || r.status === "failed"))
            .sort((a, b) => a.created_at - b.created_at);
        }
        if (/WHERE status IN \('pending','failed'\)/i.test(sql)) {
          return rows
            .filter((r) => r.status === "pending" || r.status === "failed")
            .sort((a, b) => a.created_at - b.created_at);
        }
        if (/WHERE group_id = \?/i.test(sql)) {
          return rows
            .filter((r) => r.group_id === p[0])
            .sort((a, b) => a.created_at - b.created_at);
        }
        return rows.sort((a, b) => a.created_at - b.created_at);
      }),
    })
  ),
}));

import { chatOutbox } from "../../lib/chat/outbox";

describe("chatOutbox", () => {
  beforeEach(() => {
    mockOutboxRows.clear();
    (global as any).fetch = jest.fn();
  });

  it("enqueue adds an entry with pending status", async () => {
    const entry = await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "hello" });
    expect(entry.groupId).toBe("group-1");
    expect(entry.status).toBe("pending");
    expect(entry.attempts).toBe(0);
    expect(entry.payload.content).toBe("hello");
    const list = await chatOutbox.list("group-1");
    expect(list).toHaveLength(1);
  });

  it("list filters by groupId", async () => {
    await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "a" });
    await chatOutbox.enqueue("group-2", { messageType: "TEXT", content: "b" });
    const g1 = await chatOutbox.list("group-1");
    const g2 = await chatOutbox.list("group-2");
    expect(g1).toHaveLength(1);
    expect(g2).toHaveLength(1);
    expect(g1[0].payload.content).toBe("a");
    expect(g2[0].payload.content).toBe("b");
  });

  it("flush sends pending entries and removes them on success", async () => {
    await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "first" });
    await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "second" });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "server-1" }),
      text: () => Promise.resolve(""),
    });

    const result = await chatOutbox.flush({
      groupId: "group-1",
      getToken: async () => "token",
    });
    expect(result.sentClientIds).toHaveLength(2);
    expect(result.failedClientIds).toHaveLength(0);
    const remaining = await chatOutbox.list("group-1");
    expect(remaining).toHaveLength(0);
  });

  it("flush marks entries failed on HTTP error and keeps them in outbox", async () => {
    await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "boom" });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("server error"),
    });

    const result = await chatOutbox.flush({
      groupId: "group-1",
      getToken: async () => "token",
    });
    expect(result.sentClientIds).toHaveLength(0);
    expect(result.failedClientIds).toHaveLength(1);
    const remaining = await chatOutbox.pending("group-1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].status).toBe("failed");
    expect(remaining[0].lastError).toContain("HTTP 500");
  });

  it("flush stops retrying after max attempts", async () => {
    const entry = await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "x" });
    // Simulate 5 prior attempts
    for (let i = 0; i < 5; i++) await chatOutbox.incrementAttempts(entry.clientId);

    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, text: () => Promise.resolve("") });

    const result = await chatOutbox.flush({
      groupId: "group-1",
      getToken: async () => "token",
    });
    expect(result.failedClientIds).toContain(entry.clientId);
    expect(result.sentClientIds).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retry resets a failed entry to pending", async () => {
    const entry = await chatOutbox.enqueue("group-1", { messageType: "TEXT", content: "x" });
    await chatOutbox.markStatus(entry.clientId, "failed", "boom");
    let pending = await chatOutbox.pending("group-1");
    expect(pending[0].status).toBe("failed");

    await chatOutbox.retry(entry.clientId);
    pending = await chatOutbox.pending("group-1");
    expect(pending[0].status).toBe("pending");
    expect(pending[0].lastError).toBeNull();
  });
});
