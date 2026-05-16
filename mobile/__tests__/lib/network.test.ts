import { request, ApiError, setOfflineChecker } from "../../lib/api";

global.fetch = jest.fn();

function mockOk() {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true }),
  });
}

describe("requireOnline gate (api.ts + network checker)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOfflineChecker(null);
  });

  afterEach(() => {
    setOfflineChecker(null);
  });

  it("does not call the network checker when requireOnline is false", async () => {
    const checker = jest.fn(() => Promise.resolve(true));
    setOfflineChecker(checker);
    mockOk();

    await request("/api/mobile/admin/overview");

    expect(checker).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("blocks a write with OFFLINE when checker reports offline", async () => {
    const checker = jest.fn(() => Promise.resolve(true));
    setOfflineChecker(checker);

    let caught: ApiError | undefined;
    try {
      await request("/api/mobile/finance/receipts", {
        method: "POST",
        body: { amount: 100 },
        requireOnline: true,
        idempotencyKey: "receipt-1",
      });
    } catch (err) {
      caught = err as ApiError;
    }

    expect(global.fetch).not.toHaveBeenCalled();
    expect(checker).toHaveBeenCalledTimes(1);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught?.code).toBe("OFFLINE");
    expect(caught?.retryable).toBe(false);
  });

  it("lets the write proceed when checker reports online", async () => {
    const checker = jest.fn(() => Promise.resolve(false));
    setOfflineChecker(checker);
    mockOk();

    await request("/api/mobile/finance/receipts", {
      method: "POST",
      body: { amount: 100 },
      requireOnline: true,
      idempotencyKey: "receipt-2",
    });

    expect(checker).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls through (no block) when no checker is registered", async () => {
    mockOk();

    await request("/api/mobile/finance/receipts", {
      method: "POST",
      body: { amount: 100 },
      requireOnline: true,
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
