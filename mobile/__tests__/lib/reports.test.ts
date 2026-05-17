import { createReportsClient } from "../../lib/reports";

describe("createReportsClient", () => {
  it("loads report detail by kind", async () => {
    const request = jest.fn(async () => ({ rows: [], summary: [] }));
    const client = createReportsClient(request as any);
    await client.getReport("profit", 30);
    expect(request).toHaveBeenCalledWith("/api/mobile/reports/profit?days=30", {
      retries: 1,
    });
  });
});
