import { editMessage, deleteMessage, markMessagesRead } from "../../lib/chat/api";

describe("chat api helpers", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  describe("editMessage", () => {
    it("PATCHes the message and returns the parsed JSON", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({ id: "m1", content: "edited", editedAt: "2025-01-01T00:00:00.000Z" }),
      });

      const result = await editMessage({
        groupId: "g1",
        messageId: "m1",
        content: "edited",
        getToken: async () => "tok",
      });

      expect(result.id).toBe("m1");
      expect(result.editedAt).toBeTruthy();
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/messages/m1");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ content: "edited" });
      expect(init.headers.Authorization).toBe("Bearer tok");
    });

    it("throws on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("not allowed"),
      });
      await expect(
        editMessage({
          groupId: "g1",
          messageId: "m1",
          content: "x",
          getToken: async () => "tok",
        })
      ).rejects.toThrow(/Edit failed/);
    });
  });

  describe("deleteMessage", () => {
    it("DELETEs the message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });
      await deleteMessage({
        groupId: "g1",
        messageId: "m1",
        getToken: async () => "tok",
      });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/messages/m1");
      expect(init.method).toBe("DELETE");
      expect(init.headers.Authorization).toBe("Bearer tok");
    });

    it("throws on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 410,
        text: () => Promise.resolve("gone"),
      });
      await expect(
        deleteMessage({
          groupId: "g1",
          messageId: "m1",
          getToken: async () => "tok",
        })
      ).rejects.toThrow(/Delete failed/);
    });
  });

  describe("markMessagesRead", () => {
    it("returns 0 immediately when given an empty list (no fetch)", async () => {
      const marked = await markMessagesRead({
        groupId: "g1",
        messageIds: [],
        getToken: async () => "tok",
      });
      expect(marked).toBe(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("POSTs the ids and returns marked count", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ marked: 2 }),
      });
      const marked = await markMessagesRead({
        groupId: "g1",
        messageIds: ["a", "b"],
        getToken: async () => "tok",
      });
      expect(marked).toBe(2);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/messages/read");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ messageIds: ["a", "b"] });
    });

    it("returns 0 on non-OK without throwing (best-effort)", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      const marked = await markMessagesRead({
        groupId: "g1",
        messageIds: ["a"],
        getToken: async () => "tok",
      });
      expect(marked).toBe(0);
    });
  });
});
