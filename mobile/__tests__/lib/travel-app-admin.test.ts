import { createTravelAppAdminClient } from "../../lib/travel-app-admin";

describe("createTravelAppAdminClient", () => {
  it("loads overview", async () => {
    const request = jest.fn(async () => ({ users: [], chatGroups: [], mobileAccess: {} }));
    const client = createTravelAppAdminClient(request as any);
    await client.getOverview();
    expect(request).toHaveBeenCalledWith("/api/mobile/travel-app-admin/overview", { retries: 1 });
  });

  it("updates users and chat members with idempotency", async () => {
    const request = jest.fn(async () => ({ success: true }));
    const client = createTravelAppAdminClient(request as any);
    await client.createUser({ name: "A", email: "a@example.com" });
    await client.updateUser("u/1", { isApproved: true });
    await client.addMember("g1", { travelAppUserId: "u1", role: "TOURIST" });
    await client.removeMember("g1", "u1");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/travel-app-admin/users");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^travel-user-create-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/travel-app-admin/users/u%2F1");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^travel-user-update-/);
    expect(request.mock.calls[2][0]).toBe("/api/mobile/travel-app-admin/chat-groups/g1/members");
    expect(request.mock.calls[3][1].method).toBe("DELETE");
    expect(request.mock.calls[3][1].headers["Idempotency-Key"]).toMatch(/^chat-member-remove-/);
  });
});

