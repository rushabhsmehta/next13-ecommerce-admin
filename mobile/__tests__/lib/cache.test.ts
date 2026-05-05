import { cache, CACHE_KEYS, CACHE_TTL } from "../../lib/cache";

describe("cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CACHE_KEYS", () => {
    it("generates PACKAGES key with params", () => {
      const key = CACHE_KEYS.PACKAGES({ category: "International", limit: "10" });
      expect(key).toBe('packages:{"category":"International","limit":"10"}');
    });

    it("generates PACKAGES key without params", () => {
      const key = CACHE_KEYS.PACKAGES();
      expect(key).toBe("packages:{}");
    });

    it("generates DESTINATIONS key", () => {
      expect(CACHE_KEYS.DESTINATIONS).toBe("destinations");
    });

    it("generates PACKAGE key with slug", () => {
      expect(CACHE_KEYS.PACKAGE("manali-trip")).toBe("package:manali-trip");
    });

    it("generates DESTINATION key with id", () => {
      expect(CACHE_KEYS.DESTINATION("loc-123")).toBe("destination:loc-123");
    });
  });

  describe("CACHE_TTL", () => {
    it("has correct TTL values", () => {
      expect(CACHE_TTL.PACKAGES).toBe(300);
      expect(CACHE_TTL.DESTINATIONS).toBe(300);
      expect(CACHE_TTL.PACKAGE).toBe(600);
      expect(CACHE_TTL.DESTINATION).toBe(600);
    });
  });

  describe("cache operations", () => {
    it("cache.get returns null for non-existent key", async () => {
      const result = await cache.get("non-existent");
      expect(result).toBeNull();
    });

    it("cache.set stores value", async () => {
      await expect(cache.set("test", { data: "value" }, 60)).resolves.not.toThrow();
    });

    it("cache.delete removes key", async () => {
      await expect(cache.delete("test")).resolves.not.toThrow();
    });

    it("cache.clear removes all entries", async () => {
      await expect(cache.clear()).resolves.not.toThrow();
    });

    it("cache.clearExpired removes expired entries", async () => {
      await expect(cache.clearExpired()).resolves.not.toThrow();
    });
  });
});