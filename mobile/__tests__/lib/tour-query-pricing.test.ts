import { createTourQueryPricingClient } from "../../lib/tour-query-pricing";

describe("createTourQueryPricingClient", () => {
  it("compare hits the variants endpoint with an encoded id", async () => {
    const request = jest.fn(async () => ({
      tourPackageQueryId: "q1",
      confirmedVariantId: null,
      hasPricing: false,
      variants: [],
    }));
    const client = createTourQueryPricingClient(request as any);
    await client.compare("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/a%2Fb/variants"
    );
  });
});
