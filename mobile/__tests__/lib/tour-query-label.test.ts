import { resolveTourQueryLabel } from "../../lib/tour-query-label";

describe("resolveTourQueryLabel", () => {
  it("prefers tourPackageQueryName over number", () => {
    expect(
      resolveTourQueryLabel({
        tourPackageQueryName: "Goa 4N/5D",
        tourPackageQueryNumber: "TPQ-1782566933191",
      })
    ).toBe("Goa 4N/5D");
  });

  it("falls back to tourPackageQueryNumber when name is empty", () => {
    expect(
      resolveTourQueryLabel({
        tourPackageQueryName: "   ",
        tourPackageQueryNumber: "TPQ-1042",
      })
    ).toBe("TPQ-1042");
  });

  it("falls back to tourPackageQueryNumber when name is null", () => {
    expect(
      resolveTourQueryLabel({
        tourPackageQueryName: null,
        tourPackageQueryNumber: "TPQ-1042",
      })
    ).toBe("TPQ-1042");
  });

  it("uses custom fallback when both are missing", () => {
    expect(resolveTourQueryLabel({}, "query")).toBe("query");
  });

  it("trims whitespace from name", () => {
    expect(
      resolveTourQueryLabel({
        tourPackageQueryName: "  John - Goa Package  ",
        tourPackageQueryNumber: "TPQ-1",
      })
    ).toBe("John - Goa Package");
  });
});
