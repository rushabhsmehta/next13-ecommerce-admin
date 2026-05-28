import { createTourQueryCreateClient } from "../../lib/tour-query-create";

describe("createTourQueryCreateClient", () => {
  it("create POSTs with body + idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "q1", tourPackageQueryNumber: "TPQ-1" }));
    const client = createTourQueryCreateClient(request as any);
    await client.create({ mode: "inquiry", sourceId: "inq1" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-queries");
    expect(opts.method).toBe("POST");
    expect(opts.body).toEqual({ mode: "inquiry", sourceId: "inq1", overrides: undefined });
    expect(opts.headers["Idempotency-Key"]).toMatch(/^tq-create-/);
  });

  it("fromInquiry / fromPackage / copy / fromScratch set the correct mode", async () => {
    const request = jest.fn(async () => ({ id: "q", tourPackageQueryNumber: "n" }));
    const client = createTourQueryCreateClient(request as any);
    await client.fromInquiry("i1");
    await client.fromPackage("p1", { tourPackageQueryName: "X" });
    await client.copy("c1");
    await client.fromScratch({ tourPackageQueryName: "Scratch" });
    expect(request.mock.calls[0][1].body.mode).toBe("inquiry");
    expect(request.mock.calls[1][1].body).toMatchObject({
      mode: "package",
      sourceId: "p1",
      overrides: { tourPackageQueryName: "X" },
    });
    expect(request.mock.calls[2][1].body.mode).toBe("copy");
    expect(request.mock.calls[3][1].body).toMatchObject({
      mode: "scratch",
      sourceId: "scratch",
      overrides: { tourPackageQueryName: "Scratch" },
    });
  });
});
