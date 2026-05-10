import { buildTravelPackageUrl } from "@/constants/api";

describe("buildTravelPackageUrl", () => {
  it("uses /travel/packages when base has no /travel suffix", () => {
    expect(buildTravelPackageUrl("https://aagamholidays.com", "himachal-tour")).toBe(
      "https://aagamholidays.com/travel/packages/himachal-tour"
    );
  });

  it("uses /packages when base ends with /travel (dev)", () => {
    expect(buildTravelPackageUrl("http://localhost:3000/travel", "himachal-tour")).toBe(
      "http://localhost:3000/travel/packages/himachal-tour"
    );
  });

  it("falls back to id when slug empty", () => {
    expect(buildTravelPackageUrl("https://aagamholidays.com", "", "abc-123")).toBe(
      "https://aagamholidays.com/travel/packages/abc-123"
    );
  });

  it("encodes slug segments", () => {
    expect(buildTravelPackageUrl("https://aagamholidays.com", "a b")).toBe(
      "https://aagamholidays.com/travel/packages/a%20b"
    );
  });
});
