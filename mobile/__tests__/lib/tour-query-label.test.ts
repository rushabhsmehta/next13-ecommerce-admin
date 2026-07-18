import {
  buildTourQueryName,
  resolveTourQueryLabel,
  resolveTourQueryNameForSave,
} from "../../lib/tour-query-label";

describe("buildTourQueryName", () => {
  it("joins client and package with a hyphen", () => {
    expect(buildTourQueryName("Sharma Family", "Goa 4N")).toBe(
      "Sharma Family - Goa 4N"
    );
  });

  it("uses only the available part when one side is missing", () => {
    expect(buildTourQueryName("Sharma Family", null)).toBe("Sharma Family");
    expect(buildTourQueryName("  ", "Goa 4N")).toBe("Goa 4N");
    expect(buildTourQueryName("", "")).toBe("");
  });

  it("trims whitespace from both parts", () => {
    expect(buildTourQueryName("  John  ", "  Kerala Escape  ")).toBe(
      "John - Kerala Escape"
    );
  });
});

describe("resolveTourQueryNameForSave", () => {
  it("composes client and package when name is not already composed", () => {
    expect(resolveTourQueryNameForSave("Sharma Family", "Goa 4N")).toBe(
      "Sharma Family - Goa 4N"
    );
  });

  it("does not double-prefix an already composed name", () => {
    expect(
      resolveTourQueryNameForSave("Sharma Family", "Sharma Family - Goa 4N")
    ).toBe("Sharma Family - Goa 4N");
  });
});

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
