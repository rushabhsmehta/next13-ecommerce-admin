import { createOpsPortalClient } from "../../lib/ops-portal";

const READ_CACHE = {
  cacheTtlSeconds: 30,
  dedupe: true,
  staleOnError: true,
  retries: 1,
};

describe("createOpsPortalClient", () => {
  it("lists assigned inquiries with filters", async () => {
    const request = jest.fn(async () => ({ items: [], total: 0, hasMore: false, nextOffset: 0 }));
    const client = createOpsPortalClient(request as any);
    await client.list({ search: "patel", status: "pending", limit: 10, offset: 5 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/ops-portal/my-inquiries?search=patel&status=pending&limit=10&offset=5",
      READ_CACHE
    );
  });

  it("updates progress and adds actions with idempotency keys", async () => {
    const request = jest.fn(async () => ({}));
    const client = createOpsPortalClient(request as any);
    await client.update("inq/1", { status: "contacted", remarks: "Called" });
    await client.addAction("inq/1", { actionType: "Call", remarks: "Customer answered" });

    expect(request.mock.calls[0][0]).toBe("/api/mobile/ops-portal/my-inquiries/inq%2F1");
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^ops-inquiry-update-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/ops-portal/my-inquiries/inq%2F1/actions");
    expect(request.mock.calls[1][1].method).toBe("POST");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^ops-inquiry-action-/);
  });
});
