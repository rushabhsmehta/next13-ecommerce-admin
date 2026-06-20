import { createSmartQueryBuildClient } from "../../lib/smart-query-build";

describe("smart-query-build client", () => {
  it("loads prefill with inquiry id query param", async () => {
    const authRequest = jest.fn().mockResolvedValue({ inquiry: { id: "inq-1" } });
    const client = createSmartQueryBuildClient(authRequest);
    await client.loadPrefill("inq-1");
    expect(authRequest).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/smart-build/prefill?inquiryId=inq-1",
      { retries: 1 }
    );
  });

  it("posts smart build create with idempotency header", async () => {
    const authRequest = jest.fn().mockResolvedValue({ id: "q-1", tourPackageQueryNumber: "TPQ-1" });
    const client = createSmartQueryBuildClient(authRequest);
    await client.create({
      inquiryId: "inq-1",
      tourPackageId: "pkg-1",
      mealPlanId: "meal-1",
      roomAllocations: [{ occupancyTypeId: "occ-1", quantity: 1 }],
    });
    expect(authRequest).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/smart-build",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": expect.stringMatching(/^smart-build-/),
        }),
      })
    );
  });
});
