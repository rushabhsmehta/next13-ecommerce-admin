import {
  applyPerPersonRatesToPricingItems,
  matchPricingItemRateKey,
} from "../../lib/variant-pricing-display";
import { DEFAULT_PRICING_SECTION } from "../../lib/variant-pricing-defaults";

describe("variant-pricing-display", () => {
  it("maps pricing row labels to rate keys", () => {
    expect(matchPricingItemRateKey("Per Person Cost")).toBe("perPerson");
    expect(matchPricingItemRateKey("Per Couple Cost")).toBe("perCouple");
    expect(matchPricingItemRateKey("Air Fare")).toBeNull();
  });

  it("applies per-person rates to default pricing rows", () => {
    const rows = applyPerPersonRatesToPricingItems(
      DEFAULT_PRICING_SECTION.map((item) => ({ ...item })),
      {
        nights: 6,
        totalPax: 2,
        mainPax: 2,
        extraBedPax: 0,
        cnbPax: 0,
        infantPax: 0,
        transportTotal: 0,
        transportPerPerson: 0,
        rates: {
          perPerson: { price: 45313, description: "Twin sharing" },
          perCouple: { price: 90000, description: "" },
          perPersonWithExtraBed: { price: null, description: "" },
          childWithMattress: { price: null, description: "" },
          childWithoutMattress: { price: null, description: "" },
          childBelow5WithSeat: { price: null, description: "" },
          childBelow5WithoutSeat: { price: null, description: "" },
        },
      },
      { numChild5to12: 0, numChild0to5: 0 }
    );

    expect(rows[0].price).toBe("45313");
    expect(rows[0].description).toContain("2 Adults");
    expect(rows.find((row) => row.name === "Air Fare")?.price).toBe("");
  });
});
