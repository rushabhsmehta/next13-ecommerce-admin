import {
  absoluteAdminUrl,
  tourPackagePdfPath,
  tourPackagePdfWithVariantsPath,
} from "../../lib/tour-packages-web-urls";

describe("tour-packages-web-urls", () => {
  it("builds PDF generator paths", () => {
    expect(tourPackagePdfPath("a/b")).toBe("/tourPackagePDFGenerator/a%2Fb");
    expect(tourPackagePdfWithVariantsPath("q1")).toBe(
      "/tourPackagePDFGeneratorWithVariants/q1"
    );
  });

  it("joins absolute admin URLs", () => {
    expect(absoluteAdminUrl("https://admin.example.com", tourPackagePdfPath("x"))).toBe(
      "https://admin.example.com/tourPackagePDFGenerator/x"
    );
  });
});
