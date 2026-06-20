import { createTourPackageFromQueryClient } from "../../lib/tour-package-from-query";

describe("tour-package-from-query client", () => {
  it("loads prefill for a query id", async () => {
    const authRequest = jest.fn().mockResolvedValue({
      sourceQueryId: "q-1",
      tourPackageName: "Kerala 5N",
    });
    const client = createTourPackageFromQueryClient(authRequest);
    await client.loadPrefill("q-1");
    expect(authRequest).toHaveBeenCalledWith(
      "/api/mobile/tour-packages/from-query/q-1",
      { retries: 1 }
    );
  });
});
