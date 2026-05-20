import {
  absoluteAdminUrl,
  tourQueryDisplayPath,
  tourQueryFinancialSummaryPath,
  tourQueryHotelUpdatePath,
  tourQueryPdfPath,
  tourQueryPdfWithVariantsPath,
  tourQueryVoucherPath,
} from "../../lib/tour-queries-web-urls";
describe("tour-queries-web-urls", () => {
  it("encodes ids in path segments", () => {
    expect(tourQueryPdfPath("a/b")).toBe("/tourPackageQueryPDFGenerator/a%2Fb");
    expect(tourQueryDisplayPath("x y")).toBe("/tourPackageQueryDisplay/x%20y");
  });

  it("absoluteAdminUrl joins base and path", () => {
    expect(absoluteAdminUrl("https://app.example.com", "/p")).toBe("https://app.example.com/p");
    expect(absoluteAdminUrl("https://app.example.com/", "/p")).toBe("https://app.example.com/p");
    expect(absoluteAdminUrl("https://app.example.com", "p")).toBe("https://app.example.com/p");
  });

  it("covers generator and finance routes", () => {
    const id = "q1";
    expect(tourQueryPdfWithVariantsPath(id)).toBe(
      "/tourPackageQueryPDFGeneratorWithVariants/q1"
    );
    expect(tourQueryFinancialSummaryPath(id)).toBe("/fetchaccounts/q1");
  });

  it("covers hotel update route", () => {
    expect(tourQueryHotelUpdatePath("abc")).toBe(
      "/tourPackageQueryHotelUpdate/abc"
    );
  });

  it("covers booking voucher route", () => {
    expect(tourQueryVoucherPath("abc")).toBe(
      "/tourPackageQueryVoucherDisplay/abc"
    );
    expect(tourQueryVoucherPath("a/b")).toBe(
      "/tourPackageQueryVoucherDisplay/a%2Fb"
    );
  });
});
