import {
  applyPercentDiscountToPricingComponents,
  computeSeasonalPricingTotals,
  computeVariantDiscount,
  computeVariantDiscountWithAirFare,
  formatDiscountLabel,
  isAirFarePricingLabel,
  sumAirFareAmount,
  sumTaxablePricingAmount,
} from "../../lib/variant-pricing-discount";

describe("variant-pricing-discount", () => {
  it("computes percentage discount totals", () => {
    const result = computeVariantDiscount(100000, {
      type: "percent",
      inputValue: 10,
      reason: "Early bird",
    });
    expect(result.amount).toBe(10000);
    expect(result.totalCost).toBe(90000);
    expect(result.appliedDiscount?.inputValue).toBe(10);
  });

  it("computes fixed discount totals", () => {
    const result = computeVariantDiscount(50000, {
      type: "fixed",
      inputValue: 7500,
    });
    expect(result.amount).toBe(7500);
    expect(result.totalCost).toBe(42500);
  });

  it("identifies Air Fare labels and splits taxable vs air fare amounts", () => {
    expect(isAirFarePricingLabel("Air Fare")).toBe(true);
    expect(isAirFarePricingLabel("Airfare")).toBe(true);
    expect(isAirFarePricingLabel("Per Person Cost")).toBe(false);

    const rows = [
      { name: "Per Person Cost", price: "90000" },
      { name: "Air Fare", price: "12000" },
    ];
    expect(sumTaxablePricingAmount(rows)).toBe(90000);
    expect(sumAirFareAmount(rows)).toBe(12000);
  });

  it("adds Air Fare after discount without taxing it", () => {
    const result = computeVariantDiscountWithAirFare(100000, 15000, {
      type: "percent",
      inputValue: 10,
    });
    expect(result.amount).toBe(10000);
    expect(result.subtotalBeforeDiscount).toBe(100000);
    expect(result.totalCost).toBe(105000); // 90000 + 15000
    expect(result.airFareAmount).toBe(15000);
  });

  it("updates row descriptions for percentage discounts but skips Air Fare GST/discount", () => {
    const rows = applyPercentDiscountToPricingComponents(
      [
        {
          name: "Per Person Cost",
          price: "45313",
          description: "2 Adults × Rs. 45,313 = Rs. 90,626",
        },
        {
          name: "Air Fare",
          price: "8000",
          description: "",
        },
      ],
      10
    );
    expect(rows[0].description).toContain("Discount (10%)");
    expect(rows[0].description).toContain("GST (5%)");
    expect(rows[1].description).not.toContain("GST");
    expect(rows[1].description).not.toContain("Discount");
    expect(rows[1].description).toContain("8,000");
  });

  it("computes seasonal totals with Air Fare excluded from GST", () => {
    const totals = computeSeasonalPricingTotals([
      { name: "Per Person Cost", price: 100000 },
      { name: "Air Fare", price: 20000 },
    ]);
    expect(totals.taxableTotal).toBe(100000);
    expect(totals.airFareTotal).toBe(20000);
    expect(totals.gstAmount).toBe(5000);
    expect(totals.grandTotal).toBe(125000);
  });

  it("formats discount labels", () => {
    expect(
      formatDiscountLabel({
        type: "percent",
        inputValue: 10,
        amount: 9063,
        reason: "Offer",
      })
    ).toBe("Discount (10%) — Offer");
  });
});
