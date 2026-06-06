import { createTourQueryPricingClient } from "../../lib/tour-query-pricing";

describe("createTourQueryPricingClient", () => {
  it("compare hits the variants endpoint with an encoded id", async () => {
    const request = jest.fn(async () => ({
      tourPackageQueryId: "q1",
      confirmedVariantId: null,
      hasPricing: false,
      variants: [],
    }));
    const client = createTourQueryPricingClient(request as any);
    await client.compare("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/a%2Fb/variants"
    );
  });

  it("updates variant pricing with write timeout", async () => {
    const request = jest.fn(async () => ({
      tourPackageQueryId: "q1",
      variant: { id: "v1", sourceVariantId: "source-v1", name: "Budget", sortOrder: 1 },
      pricing: null,
    }));
    const client = createTourQueryPricingClient(request as any);
    await client.updateVariantPricing("q 1", "v/1", {
      calculationMethod: "manual",
      components: [{ name: "Adult", price: "25000", description: "25000 x 2" }],
      totalCost: 50000,
      remarks: "Reviewed",
    });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/q%201/variants/v%2F1/pricing",
      {
        method: "PATCH",
        body: {
          calculationMethod: "manual",
          components: [{ name: "Adult", price: "25000", description: "25000 x 2" }],
          totalCost: 50000,
          remarks: "Reviewed",
        },
        timeout: 90000,
      }
    );
  });

  it("calculates variant pricing through the pricing endpoint", async () => {
    const request = jest.fn(async () => ({
      calculationMethod: "autoHotelTransport",
      pricingSection: [],
      totalCost: 0,
      basePrice: 0,
      appliedMarkup: { percentage: 10, amount: 0 },
      breakdown: { accommodation: 0, transport: 0 },
    }));
    const client = createTourQueryPricingClient(request as any);
    await client.calculateVariantPricing("q1", "v1", { markup: 10 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/q1/variants/v1/pricing",
      {
        method: "POST",
        body: { markup: 10 },
        timeout: 90000,
      }
    );
  });

  it("updates variant build rooms with write timeout", async () => {
    const request = jest.fn(async () => ({
      tourPackageQueryId: "q1",
      variant: { id: "v1", sourceVariantId: "source-v1", name: "Budget", sortOrder: 1 },
      build: {
        variantRoomAllocations: {},
        variantTransportDetails: {},
      },
    }));
    const client = createTourQueryPricingClient(request as any);
    await client.updateVariantBuild("q 1", "v/1", {
      roomsByItinerary: {
        "it 1": [
          {
            roomTypeId: "rt1",
            occupancyTypeId: "occ1",
            mealPlanId: "mp1",
            quantity: 2,
          },
        ],
        "it 2": [],
      },
      transportByItinerary: {
        "it 1": [
          {
            vehicleTypeId: "vehicle1",
            quantity: 1,
            description: "Airport pickup",
          },
        ],
        "it 2": [],
      },
    });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries/q%201/variants/v%2F1/build",
      {
        method: "PATCH",
        body: {
          roomsByItinerary: {
            "it 1": [
              {
                roomTypeId: "rt1",
                occupancyTypeId: "occ1",
                mealPlanId: "mp1",
                quantity: 2,
              },
            ],
            "it 2": [],
          },
          transportByItinerary: {
            "it 1": [
              {
                vehicleTypeId: "vehicle1",
                quantity: 1,
                description: "Airport pickup",
              },
            ],
            "it 2": [],
          },
        },
        timeout: 90000,
      }
    );
  });
});
