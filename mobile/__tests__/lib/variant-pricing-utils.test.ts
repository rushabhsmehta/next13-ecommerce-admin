import {
  applySelectedPackageComponents,
  calculateComponentTotalPrice,
  getOccupancyMultiplier,
  matchTourPackagePricingPeriod,
} from "../../lib/variant-pricing-utils";

describe("variant-pricing-utils", () => {
  it("maps occupancy multipliers from component names", () => {
    expect(getOccupancyMultiplier("Quad Room")).toBe(4);
    expect(getOccupancyMultiplier("Triple sharing")).toBe(3);
    expect(getOccupancyMultiplier("Double occupancy")).toBe(2);
    expect(getOccupancyMultiplier("Per Person Cost")).toBe(1);
  });

  it("calculates component totals with occupancy and room quantity", () => {
    const total = calculateComponentTotalPrice(
      {
        id: "c1",
        price: 1000,
        pricingAttributeName: "Double",
      },
      2
    );
    expect(total).toBe(4000);
  });

  it("matches exactly one pricing period", () => {
    const periods = [
      {
        id: "p1",
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-31T00:00:00.000Z",
        mealPlanId: "mp1",
        numberOfRooms: 1,
      },
      {
        id: "p2",
        startDate: "2026-08-01T00:00:00.000Z",
        endDate: "2026-08-31T00:00:00.000Z",
        mealPlanId: "mp1",
        numberOfRooms: 2,
      },
    ];

    const match = matchTourPackagePricingPeriod(periods, {
      queryStartDate: "2026-07-10",
      queryEndDate: "2026-07-20",
      mealPlanId: "mp1",
      numberOfRooms: 1,
    });

    expect(match.ok).toBe(true);
    if (match.ok) {
      expect(match.period.id).toBe("p1");
    }
  });

  it("builds selected package component rows", () => {
    const { items, totalPrice } = applySelectedPackageComponents(
      [
        {
          id: "c1",
          price: 5000,
          pricingAttributeName: "Per Person",
        },
      ],
      ["c1"],
      { c1: 1 }
    );
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Per Person");
    expect(totalPrice).toBe(5000);
  });
});
