import {
  applyBasePricingAdjustment,
  calculateBasePricingSubtotal,
  clearBasePricingAdjustment,
  getFirstPricingAdjustment,
} from "@/lib/base-pricing-adjustment";

describe("base pricing adjustment", () => {
  it("adds GST-only totals with zero discount", () => {
    const result = applyBasePricingAdjustment(
      [{ name: "Adult", price: "10000", description: "10000 x 2 = Rs. 20,000" }],
      { discountType: "percent", inputValue: 0, calculatedAt: "2026-07-07T00:00:00.000Z" }
    );

    expect(result.adjustment.subtotalBeforeDiscount).toBe(20000);
    expect(result.adjustment.discountAmount).toBe(0);
    expect(result.adjustment.gstAmount).toBe(1000);
    expect(result.adjustment.totalIncludingGst).toBe(21000);
    expect(result.items[0].description).toContain("GST (5%)");
  });

  it("applies percent discount before GST", () => {
    const result = applyBasePricingAdjustment(
      [
        { name: "Adult", price: "10000", description: "2 Adults x Rs. 10,000 = Rs. 20,000" },
        { name: "Child", price: "5000", description: "" },
      ],
      { discountType: "percent", inputValue: 10, reason: "Festival", calculatedAt: "2026-07-07T00:00:00.000Z" }
    );

    expect(result.adjustment.subtotalBeforeDiscount).toBe(25000);
    expect(result.adjustment.discountAmount).toBe(2500);
    expect(result.adjustment.taxableAmount).toBe(22500);
    expect(result.adjustment.gstAmount).toBe(1125);
    expect(result.adjustment.totalIncludingGst).toBe(23625);
    expect(result.items[0].description).toContain("Discount (10%)");
    expect(getFirstPricingAdjustment(result.items)?.reason).toBe("Festival");
  });

  it("applies fixed discount before GST and can clear metadata", () => {
    const result = applyBasePricingAdjustment(
      [
        { name: "Adult", price: "12000", description: "" },
        { name: "Child", price: "8000", description: "" },
      ],
      { discountType: "fixed", inputValue: 3000, calculatedAt: "2026-07-07T00:00:00.000Z" }
    );

    expect(result.adjustment.subtotalBeforeDiscount).toBe(20000);
    expect(result.adjustment.discountAmount).toBe(3000);
    expect(result.adjustment.taxableAmount).toBe(17000);
    expect(result.adjustment.gstAmount).toBe(850);
    expect(result.adjustment.totalIncludingGst).toBe(17850);
    expect(result.items[0].description).toContain("Discount (fixed share)");

    const cleared = clearBasePricingAdjustment(result.items);
    expect(getFirstPricingAdjustment(cleared)).toBeNull();
    expect(calculateBasePricingSubtotal(cleared)).toBe(20000);
  });
});
