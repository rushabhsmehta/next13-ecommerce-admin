import { firstRouteParam } from "@/lib/route-params";

describe("firstRouteParam", () => {
  it("returns undefined for empty values", () => {
    expect(firstRouteParam(undefined)).toBeUndefined();
    expect(firstRouteParam("")).toBeUndefined();
    expect(firstRouteParam("   ")).toBeUndefined();
    expect(firstRouteParam([])).toBeUndefined();
  });

  it("returns the string for a single segment", () => {
    expect(firstRouteParam("abc-123")).toBe("abc-123");
    expect(firstRouteParam("  abc-123  ")).toBe("abc-123");
  });

  it("returns the first entry for array params", () => {
    expect(firstRouteParam(["first", "second"])).toBe("first");
  });
});
