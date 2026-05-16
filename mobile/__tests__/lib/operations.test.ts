import { createOperationsClient } from "../../lib/operations";

describe("createOperationsClient", () => {
  it("listSuppliers builds the query string", async () => {
    const request = jest.fn(async () => ({
      suppliers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listSuppliers({ search: "acme", limit: 10, offset: 20 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/suppliers?search=acme&limit=10&offset=20"
    );
  });

  it("listSuppliers with no filters omits the query string", async () => {
    const request = jest.fn(async () => ({
      suppliers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listSuppliers();
    expect(request).toHaveBeenCalledWith("/api/mobile/operations/suppliers");
  });

  it("getSupplier encodes the id", async () => {
    const request = jest.fn(async () => ({}));
    const client = createOperationsClient(request as any);
    await client.getSupplier("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/suppliers/a%2Fb"
    );
  });

  it("createSupplier POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "s1", name: "X" }));
    const client = createOperationsClient(request as any);
    await client.createSupplier({ name: "X" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/suppliers");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^supplier-create-/);
  });

  it("updateSupplier PATCHes; deleteSupplier DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "s1", name: "X" }));
    const client = createOperationsClient(request as any);
    await client.updateSupplier("s1", { name: "Y" });
    await client.deleteSupplier("s1");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/operations/suppliers/s1"
    );
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("listStaff builds query (search + activeOnly)", async () => {
    const request = jest.fn(async () => ({ staff: [], total: 0 }));
    const client = createOperationsClient(request as any);
    await client.listStaff({ search: "priya", activeOnly: true });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/staff?search=priya&activeOnly=true"
    );
  });

  it("createStaff POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "st1" }));
    const client = createOperationsClient(request as any);
    await client.createStaff({
      name: "Priya",
      email: "p@x.com",
      password: "secret1",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/staff");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^staff-create-/);
  });

  it("updateStaff PATCHes; deleteStaff DELETEs; ids encoded", async () => {
    const request = jest.fn(async () => ({ id: "st1" }));
    const client = createOperationsClient(request as any);
    await client.updateStaff("a b", { name: "P", email: "p@x.com" });
    await client.deleteStaff("a b");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/operations/staff/a%20b");
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][0]).toBe("/api/mobile/operations/staff/a%20b");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("getStaff hits the detail endpoint", async () => {
    const request = jest.fn(async () => ({
      staff: {},
      summary: { assignedInquiries: 0 },
    }));
    const client = createOperationsClient(request as any);
    await client.getStaff("st1");
    expect(request).toHaveBeenCalledWith("/api/mobile/operations/staff/st1");
  });
});
