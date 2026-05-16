import { createCustomerLedgerClient } from "../../lib/customer-ledger";

describe("createCustomerLedgerClient", () => {
  it("get URL-encodes the customer id and hits the ledger endpoint", async () => {
    const request = jest.fn(async () => ({
      customer: { id: "c1", name: "Test", contact: null, email: null },
      transactions: [],
      summary: {
        totalSales: 0,
        totalReturns: 0,
        totalReceipts: 0,
        currentBalance: 0,
      },
    }));
    const client = createCustomerLedgerClient(request as any);
    await client.get("abc/def");
    expect(request).toHaveBeenCalledWith("/api/mobile/customers/abc%2Fdef/ledger");
  });
});
