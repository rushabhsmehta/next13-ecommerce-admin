import { createTourQueryFinanceClient } from "../../lib/tour-query-finance";

describe("createTourQueryFinanceClient", () => {
  it("get hits the finance endpoint with an encoded id and retries once", async () => {
    const request = jest.fn(async () => ({
      query: {
        id: "q1",
        tourPackageQueryNumber: null,
        tourPackageQueryName: null,
        customerName: null,
      },
      totals: {
        sales: 0,
        purchases: 0,
        receipts: 0,
        payments: 0,
        expenses: 0,
        incomes: 0,
        saleReturns: 0,
        purchaseReturns: 0,
        grossProfit: 0,
        netProfit: 0,
        customerOutstanding: 0,
        supplierOutstanding: 0,
      },
      sections: {
        sales: [],
        purchases: [],
        receipts: [],
        payments: [],
        expenses: [],
        incomes: [],
        saleReturns: [],
        purchaseReturns: [],
      },
    }));
    const client = createTourQueryFinanceClient(request as any);
    await client.get("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/a%2Fb/finance",
      { retries: 1 }
    );
  });
});
