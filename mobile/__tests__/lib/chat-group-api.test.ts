import {
  fetchGroupDetail,
  updateGroup,
  fetchGroupMembers,
  addGroupMember,
  removeGroupMember,
  changeMemberRole,
  leaveGroup,
  searchTravelUsers,
} from "../../lib/chat/api";

const tok = async () => "test-token";

describe("chat group + member API helpers", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  describe("fetchGroupDetail", () => {
    it("GETs the group and returns its detail + role", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({
            group: {
              id: "g1",
              name: "Trip",
              description: null,
              imageUrl: null,
              tourPackageQueryId: null,
              tourStartDate: null,
              tourEndDate: null,
              isActive: true,
              createdBy: "u1",
              createdAt: "2025-01-01",
              updatedAt: "2025-01-01",
            },
            myRole: "ADMIN",
          }),
      });
      const res = await fetchGroupDetail({ groupId: "g1", getToken: tok });
      expect(res.group.id).toBe("g1");
      expect(res.myRole).toBe("ADMIN");
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1");
      expect(init.headers.Authorization).toBe("Bearer test-token");
    });

    it("throws on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("forbidden"),
      });
      await expect(
        fetchGroupDetail({ groupId: "g1", getToken: tok })
      ).rejects.toThrow(/Load group failed/);
    });
  });

  describe("updateGroup", () => {
    it("PATCHes only provided fields", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
        json: () =>
          Promise.resolve({
            group: {
              id: "g1",
              name: "Renamed",
              description: null,
              imageUrl: null,
              tourPackageQueryId: null,
              tourStartDate: null,
              tourEndDate: null,
              isActive: true,
              createdBy: "u1",
              createdAt: "x",
              updatedAt: "y",
            },
          }),
      });
      const result = await updateGroup({
        groupId: "g1",
        patch: { name: "Renamed", description: null },
        getToken: tok,
      });
      expect(result.name).toBe("Renamed");
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ name: "Renamed", description: null });
    });

    it("throws on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("name required"),
      });
      await expect(
        updateGroup({ groupId: "g1", patch: { name: "" }, getToken: tok })
      ).rejects.toThrow(/Update group failed/);
    });
  });

  describe("fetchGroupMembers", () => {
    it("returns the members array", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            members: [
              {
                id: "mm1",
                role: "ADMIN",
                isActive: true,
                travelAppUser: {
                  id: "u1",
                  name: "Alice",
                  email: "a@b.com",
                  phone: null,
                  avatarUrl: null,
                  isApproved: true,
                },
              },
            ],
          }),
      });
      const list = await fetchGroupMembers({ groupId: "g1", getToken: tok });
      expect(list).toHaveLength(1);
      expect(list[0].travelAppUser.name).toBe("Alice");
    });

    it("returns [] on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });
      const list = await fetchGroupMembers({ groupId: "g1", getToken: tok });
      expect(list).toEqual([]);
    });
  });

  describe("addGroupMember", () => {
    it("POSTs travelAppUserId + role", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });
      await addGroupMember({
        groupId: "g1",
        travelAppUserId: "u9",
        role: "TOURIST",
        getToken: tok,
      });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/members");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ travelAppUserId: "u9", role: "TOURIST" });
    });
  });

  describe("removeGroupMember", () => {
    it("DELETEs with memberId query param", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });
      await removeGroupMember({
        groupId: "g1",
        travelAppUserId: "u9",
        getToken: tok,
      });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/members?memberId=u9");
      expect(init.method).toBe("DELETE");
    });
  });

  describe("leaveGroup", () => {
    it("DELETEs without memberId so server defaults to caller", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });
      await leaveGroup({ groupId: "g1", getToken: tok });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/members");
      expect(String(url)).not.toContain("memberId=");
      expect(init.method).toBe("DELETE");
    });
  });

  describe("changeMemberRole", () => {
    it("PATCHes the role", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(""),
      });
      await changeMemberRole({
        groupId: "g1",
        travelAppUserId: "u9",
        role: "OPERATIONS",
        getToken: tok,
      });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("/api/chat/groups/g1/members/u9");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ role: "OPERATIONS" });
    });

    it("throws on non-OK", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("last admin"),
      });
      await expect(
        changeMemberRole({
          groupId: "g1",
          travelAppUserId: "u9",
          role: "TOURIST",
          getToken: tok,
        })
      ).rejects.toThrow(/Change role failed/);
    });
  });

  describe("searchTravelUsers", () => {
    it("returns [] for short queries without making a request", async () => {
      const res = await searchTravelUsers({ groupId: "g1", query: "a", getToken: tok });
      expect(res).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("encodes the query and groupId", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [{ id: "u1", name: "A" }] }),
      });
      const res = await searchTravelUsers({
        groupId: "g 1",
        query: "Goa & Kerala",
        getToken: tok,
      });
      expect(res).toEqual([{ id: "u1", name: "A" }]);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(String(url)).toContain("groupId=g%201");
      expect(String(url)).toContain("q=Goa%20%26%20Kerala");
    });
  });
});
