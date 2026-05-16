import { createTourQueryLifecycleClient } from "../../lib/tour-query-lifecycle";

describe("createTourQueryLifecycleClient", () => {
  function makeRequest() {
    return jest.fn(async () => ({}) as any);
  }

  it("POSTs encoded id, body action, and Idempotency-Key", async () => {
    const request = makeRequest();
    const client = createTourQueryLifecycleClient(request as any);

    await client.run("q1", "confirm");

    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-queries/q1/lifecycle");
    expect(opts.method).toBe("POST");
    expect(opts.body).toEqual({ action: "confirm" });
    expect(opts.headers?.["Idempotency-Key"]).toMatch(/^tpq-confirm-/);
  });

  it("encodes id path segments", async () => {
    const request = makeRequest();
    const client = createTourQueryLifecycleClient(request as any);
    await client.run("a/b", "archive");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/tour-queries/a%2Fb/lifecycle"
    );
    expect(request.mock.calls[0][1]?.body).toEqual({ action: "archive" });
  });
});
