import { createFinanceClient } from "../../lib/finance";

describe("createFinanceClient", () => {
  it("listAccounts GETs the accounts endpoint", async () => {
    const request = jest.fn(async () => ({ accounts: [], totalBalance: 0 }));
    const client = createFinanceClient(request as any);
    await client.listAccounts();
    expect(request).toHaveBeenCalledWith("/api/mobile/finance/accounts", {
      retries: 1,
    });
  });

  it("getAccount passes the kind query param and encodes the id", async () => {
    const request = jest.fn(async () => ({ account: {}, transactions: [] }));
    const client = createFinanceClient(request as any);
    await client.getAccount("a/b", "cash");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/finance/accounts/a%2Fb?kind=cash",
      { retries: 1 }
    );
  });

  it("createTransfer is online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "t1" }));
    const client = createFinanceClient(request as any);
    await client.createTransfer({
      from: { kind: "bank", id: "b1" },
      to: { kind: "cash", id: "c1" },
      amount: 500,
      transferDate: "2026-05-16",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/finance/transfers");
    expect(opts.method).toBe("POST");
    expect(opts.requireOnline).toBe(true);
    expect(opts.headers["Idempotency-Key"]).toMatch(/^transfer-/);
  });

  it("listParties / listAllocatable build correct query strings", async () => {
    const request = jest.fn(async () => ({ parties: [], items: [] }));
    const client = createFinanceClient(request as any);
    await client.listParties("supplier", "acme");
    await client.listAllocatable("sales", "cust1");
    await client.listAllocatable("purchases", "sup1");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/finance/parties?type=supplier&search=acme"
    );
    expect(request.mock.calls[1][0]).toBe(
      "/api/mobile/finance/allocatable?kind=sales&customerId=cust1"
    );
    expect(request.mock.calls[2][0]).toBe(
      "/api/mobile/finance/allocatable?kind=purchases&supplierId=sup1"
    );
  });

  it("createReceipt / createPayment are online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "r1" }));
    const client = createFinanceClient(request as any);
    await client.createReceipt({
      customerId: "c1",
      receiptDate: "2026-05-16",
      amount: 1000,
      accountKind: "bank",
      accountId: "b1",
    });
    await client.createPayment({
      supplierId: "s1",
      paymentDate: "2026-05-16",
      amount: 500,
      accountKind: "cash",
      accountId: "ca1",
    });
    expect(request.mock.calls[0][0]).toBe("/api/mobile/finance/receipts");
    expect(request.mock.calls[0][1].requireOnline).toBe(true);
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(
      /^receipt-/
    );
    expect(request.mock.calls[1][0]).toBe("/api/mobile/finance/payments");
    expect(request.mock.calls[1][1].requireOnline).toBe(true);
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(
      /^payment-/
    );
  });

  it("sale/purchase/return creators are online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "x" }));
    const client = createFinanceClient(request as any);
    await client.createSale({
      customerId: "c1",
      saleDate: "2026-05-16",
      salePrice: 1000,
    });
    await client.createPurchase({
      supplierId: "s1",
      purchaseDate: "2026-05-16",
      price: 500,
    });
    await client.createSaleReturn({
      saleDetailId: "sd1",
      returnDate: "2026-05-16",
      amount: 100,
    });
    await client.createPurchaseReturn({
      purchaseDetailId: "pd1",
      returnDate: "2026-05-16",
      amount: 50,
    });
    const endpoints = request.mock.calls.map((c) => c[0]);
    expect(endpoints).toEqual([
      "/api/mobile/finance/sales",
      "/api/mobile/finance/purchases",
      "/api/mobile/finance/sale-returns",
      "/api/mobile/finance/purchase-returns",
    ]);
    request.mock.calls.forEach((c) => {
      expect(c[1].requireOnline).toBe(true);
      expect(c[1].headers["Idempotency-Key"]).toBeDefined();
    });
  });

  it("read helpers build correct credit-only / tds endpoints", async () => {
    const request = jest.fn(async () => ({}));
    const client = createFinanceClient(request as any);
    await client.listSaleReturns(true);
    await client.listPurchaseReturns(true);
    await client.listTds("pending");
    await client.listChallans();
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/finance/sale-returns?creditOnly=1"
    );
    expect(request.mock.calls[1][0]).toBe(
      "/api/mobile/finance/purchase-returns?creditOnly=1"
    );
    expect(request.mock.calls[2][0]).toBe(
      "/api/mobile/finance/tds?status=pending"
    );
    expect(request.mock.calls[3][0]).toBe(
      "/api/mobile/finance/tds/challans"
    );
  });

  it("createChallan is online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "ch1" }));
    const client = createFinanceClient(request as any);
    await client.createChallan({ bsrCode: "1234" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/finance/tds/challans");
    expect(opts.requireOnline).toBe(true);
    expect(opts.headers["Idempotency-Key"]).toMatch(/^challan-/);
  });

  it("computeTax posts to compute-tax (online, no idempotency — pure calc)", async () => {
    const request = jest.fn(async () => ({
      baseAmount: 1000,
      gstPercentage: 5,
      gstAmount: 50,
      cgst: 25,
      sgst: 25,
      igst: 0,
      total: 1050,
      tds: null,
    }));
    const client = createFinanceClient(request as any);
    await client.computeTax({ baseAmount: 1000, gstPercentage: 5 });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/finance/compute-tax");
    expect(opts.method).toBe("POST");
    expect(opts.requireOnline).toBe(true);
    expect(opts.headers).toBeUndefined();
  });

  it("depositTds is online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "d1" }));
    const client = createFinanceClient(request as any);
    await client.depositTds({
      depositDate: "2026-05-16",
      transactionIds: ["t1", "t2"],
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/finance/tds/deposit");
    expect(opts.requireOnline).toBe(true);
    expect(opts.headers["Idempotency-Key"]).toMatch(/^tds-deposit-/);
  });

  it("voucherEndpoint builds an encoded type/id path", () => {
    const client = createFinanceClient((async () => ({})) as any);
    expect(client.voucherEndpoint("sale", "a b")).toBe(
      "/api/mobile/finance/vouchers/sale/a%20b"
    );
    expect(client.voucherEndpoint("purchase", "p/1")).toBe(
      "/api/mobile/finance/vouchers/purchase/p%2F1"
    );
  });

  it("createExpense and createIncome are online-only + idempotent", async () => {
    const request = jest.fn(async () => ({ id: "x" }));
    const client = createFinanceClient(request as any);
    await client.createExpense({
      amount: 100,
      expenseDate: "2026-05-16",
      isAccrued: true,
    });
    await client.createIncome({
      amount: 200,
      incomeDate: "2026-05-16",
      accountKind: "bank",
      accountId: "b1",
    });
    expect(request.mock.calls[0][1].requireOnline).toBe(true);
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(
      /^expense-/
    );
    expect(request.mock.calls[1][1].requireOnline).toBe(true);
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(
      /^income-/
    );
  });
});
