import { request, travelApi, ApiError } from "../../lib/api";
import { API_BASE_URL } from "../../constants/api";

global.fetch = jest.fn();

function createMockResponse(data: any, ok = true, status = 200): Partial<Response> {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  };
}

describe("travelApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPackages", () => {
    it("returns packages from API", async () => {
      const mockData = {
        packages: [
          { id: "1", tourPackageName: "Test Package", pricePerAdult: "5000" },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse(mockData));

      const result = await travelApi.getPackages({ limit: 10 });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/travel/packages?limit=10`,
        expect.any(Object)
      );
    });

    it("appends locationId param when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages({ locationId: "loc-123" });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("locationId=loc-123"),
        expect.any(Object)
      );
    });

    it("appends category param when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages({ category: "International" });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("category=International"),
        expect.any(Object)
      );
    });

    it("appends search param when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages({ search: "Goa" });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search=Goa"),
        expect.any(Object)
      );
    });

    it("encodes special characters in search param", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages({ search: "Goa & Kerala" });

      const callUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(new URL(callUrl).searchParams.get("search")).toBe("Goa & Kerala");
    });

    it("handles missing optional params gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/travel/packages`,
        expect.any(Object)
      );
    });

    it("appends offset param when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ packages: [] }));

      await travelApi.getPackages({ limit: 8, offset: 16 });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/travel/packages?limit=8&offset=16`,
        expect.any(Object)
      );
    });
  });

  describe("getDestinations", () => {
    it("calls the destinations endpoint", async () => {
      const mockData = { destinations: [{ id: "1", label: "Goa" }] };
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse(mockData));

      const result = await travelApi.getDestinations();

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/travel/destinations`,
        expect.any(Object)
      );
    });
  });

  describe("search", () => {
    it("encodes query string in search endpoint", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ results: [] }));

      await travelApi.search("Kerala backwaters");

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/travel/search?q=Kerala%20backwaters`,
        expect.any(Object)
      );
    });
  });

  describe("getPackageBySlug", () => {
    it("calls tourPackageBySlug endpoint with slug", async () => {
      const mockData = { id: "1", tourPackageName: "Manali Trip" };
      (global.fetch as jest.Mock).mockResolvedValue(createMockResponse(mockData));

      const result = await travelApi.getPackageBySlug("manali-trip");

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/tourPackageBySlug/manali-trip`,
        expect.any(Object)
      );
    });
  });
});

describe("ApiError", () => {
  it("creates error with all properties", () => {
    const error = new ApiError("Not found", 404, false, "NOT_FOUND");

    expect(error.message).toBe("Not found");
    expect(error.statusCode).toBe(404);
    expect(error.retryable).toBe(false);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.name).toBe("ApiError");
  });

  it("defaults retryable to false for 4xx errors", () => {
    const error = new ApiError("Unauthorized", 401);

    expect(error.retryable).toBe(false);
  });

  it("sets retryable to true for 5xx errors", () => {
    const error = new ApiError("Server error", 500, true);

    expect(error.retryable).toBe(true);
  });

  it("sets retryable to true for network errors", () => {
    const error = new ApiError("Network error", null, true);

    expect(error.retryable).toBe(true);
  });
});

describe("request retry safety", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not retry non-idempotent writes by default", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      createMockResponse({ error: "Server error" }, false, 500)
    );

    await expect(
      request("/api/mobile/admin/test-write", { method: "POST", body: { amount: 100 } })
    ).rejects.toMatchObject({ statusCode: 500 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("sends an idempotency key when provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createMockResponse({ ok: true }));

    await request("/api/mobile/admin/test-write", {
      method: "POST",
      body: { amount: 100 },
      idempotencyKey: "receipt-123",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/mobile/admin/test-write`,
      expect.objectContaining({
        headers: expect.objectContaining({ "Idempotency-Key": "receipt-123" }),
      })
    );
  });
});