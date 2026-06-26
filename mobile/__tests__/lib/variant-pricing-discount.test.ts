import {
  applyPercentDiscountToPricingComponents,
  computeVariantDiscount,
  formatDiscountLabel,
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

  it("updates row descriptions for percentage discounts", () => {
    const rows = applyPercentDiscountToPricingComponents(
      [
        {
          name: "Per Person Cost",
          price: "45313",
          description: "2 Adults × Rs. 45,313 = Rs. 90,626",
        },
      ],
      10
    );
    expect(rows[0].description).toContain("Discount (10%)");
    expect(rows[0].description).toContain("GST (5%)");
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
