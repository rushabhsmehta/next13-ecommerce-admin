import { createTourQueryEditClient } from "../../lib/tour-query-edit";

describe("createTourQueryEditClient", () => {
  it("update sends PATCH with the payload to the encoded id endpoint", async () => {
    const request = jest.fn(async () => ({ id: "q1", updated: true }));
    const client = createTourQueryEditClient(request as any);
    await client.update("a b", {
      tourPackageQueryName: "New name",
      inclusions: ["one", "two"],
      itineraries: [{ id: "it1", itineraryTitle: "Day 1" }],
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-queries/a%20b");
    expect(opts.method).toBe("PATCH");
    expect(opts.body.tourPackageQueryName).toBe("New name");
    expect(opts.body.inclusions).toEqual(["one", "two"]);
    expect(opts.body.itineraries[0]).toEqual({ id: "it1", itineraryTitle: "Day 1" });
  });
});
