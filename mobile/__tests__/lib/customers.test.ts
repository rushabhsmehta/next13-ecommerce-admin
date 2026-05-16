import { createCustomersClient } from "../../lib/customers";

describe("createCustomersClient", () => {
  it("list passes filters as query parameters", async () => {
    const request = jest.fn(async () => ({
      customers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createCustomersClient(request as any);
    await client.list({ search: "ravi", associatePartnerId: "p1", limit: 10, offset: 20 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/customers?search=ravi&associatePartnerId=p1&limit=10&offset=20"
    );
  });

  it("list omits the query string when no filters are provided", async () => {
    const request = jest.fn(async () => ({
      customers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createCustomersClient(request as any);
    await client.list();
    expect(request).toHaveBeenCalledWith("/api/mobile/customers");
  });

  it("get URL-encodes the customer id", async () => {
    const request = jest.fn(async () => ({}));
    const client = createCustomersClient(request as any);
    await client.get("abc/def");
    expect(request).toHaveBeenCalledWith("/api/mobile/customers/abc%2Fdef");
  });

  it("create attaches an Idempotency-Key header so retries don't duplicate", async () => {
    const request = jest.fn(async () => ({ id: "c1" }));
    const client = createCustomersClient(request as any);
    await client.create({ name: "Test" });
    const [, options] = request.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(typeof options.headers["Idempotency-Key"]).toBe("string");
    expect(options.headers["Idempotency-Key"]).toMatch(/^customer-create-/);
  });

  it("update sends PATCH without an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "c1" }));
    const client = createCustomersClient(request as any);
    await client.update("c1", { name: "Updated" });
    const [endpoint, options] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/customers/c1");
    expect(options.method).toBe("PATCH");
    expect(options.body.name).toBe("Updated");
    expect(options.headers).toBeUndefined();
  });
});
