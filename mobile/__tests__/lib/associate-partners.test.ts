import {
  fetchAssociatePartners,
  createAssociatePartnersClient,
} from "../../lib/associate-partners";

describe("fetchAssociatePartners", () => {
  it("requests activeOnly query when set", async () => {
    const request = jest.fn(async () => []);
    await fetchAssociatePartners(request as any, { activeOnly: true });
    expect(request).toHaveBeenCalledWith("/api/associate-partners?activeOnly=true");
  });

  it("maps rows and filters empty ids", async () => {
    const request = jest.fn(async () => [
      {
        id: "p1",
        name: "Partner A",
        email: "a@x.com",
        gmail: null,
        mobileNumber: "+919999999999",
        isActive: true,
      },
      { id: "", name: "Bad" },
    ]);
    const rows = await fetchAssociatePartners(request as any);
    expect(rows).toEqual([
      {
        id: "p1",
        name: "Partner A",
        email: "a@x.com",
        gmail: null,
        mobileNumber: "+919999999999",
        isActive: true,
      },
    ]);
  });

  it("defaults mobileNumber to empty string when missing", async () => {
    const request = jest.fn(async () => [
      { id: "p2", name: "Partner B" },
    ]);
    const rows = await fetchAssociatePartners(request as any);
    expect(rows).toEqual([
      {
        id: "p2",
        name: "Partner B",
        email: null,
        gmail: null,
        mobileNumber: "",
        isActive: true,
      },
    ]);
  });
});

describe("createAssociatePartnersClient", () => {
  it("list with activeOnly + search builds query string", async () => {
    const request = jest.fn(async () => ({
      partners: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createAssociatePartnersClient(request as any);
    await client.list({ activeOnly: true, search: "agency" });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/associate-partners?activeOnly=true&search=agency"
    );
  });

  it("create POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "p1" }));
    const client = createAssociatePartnersClient(request as any);
    await client.create({ name: "Acme", mobileNumber: "+919999999999" });
    const [, options] = request.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["Idempotency-Key"]).toMatch(/^partner-create-/);
  });

  it("delete sends DELETE on the typed endpoint", async () => {
    const request = jest.fn(async () => ({ deleted: true, partner: {} }));
    const client = createAssociatePartnersClient(request as any);
    await client.delete("p1");
    expect(request).toHaveBeenCalledWith("/api/mobile/associate-partners/p1", {
      method: "DELETE",
    });
  });
});
