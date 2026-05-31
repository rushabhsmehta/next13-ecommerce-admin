import { createTourQueryEditClient } from "../../lib/tour-query-edit";

describe("createTourQueryEditClient", () => {
  it("update sends PATCH with the payload to the encoded id endpoint", async () => {
    const request = jest.fn(async () => ({ id: "q1", updated: true }));
    const client = createTourQueryEditClient(request as any);
    await client.update("a b", {
      tourPackageQueryName: "New name",
      totalPrice: "50000",
      pricingCalculationMethod: "manual",
      pricingSection: [
        { name: "Adult", price: "25000", description: "25000 x 2" },
      ],
      inclusions: ["one", "two"],
      itineraries: [
        {
          id: "it1",
          dayNumber: 1,
          days: "1",
          locationId: "loc123",
          hotelId: "hot456",
          itineraryTitle: "Day 1",
          roomAllocations: [
            {
              roomTypeId: "rt1",
              occupancyTypeId: "occ2",
              mealPlanId: "mp3",
              quantity: 2,
              customRoomType: "Deluxe Room",
            },
          ],
        },
      ],
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-queries/a%20b");
    expect(opts.method).toBe("PATCH");
    expect(opts.timeout).toBe(90000);
    expect(opts.body.tourPackageQueryName).toBe("New name");
    expect(opts.body.totalPrice).toBe("50000");
    expect(opts.body.pricingCalculationMethod).toBe("manual");
    expect(opts.body.pricingSection).toEqual([
      { name: "Adult", price: "25000", description: "25000 x 2" },
    ]);
    expect(opts.body.inclusions).toEqual(["one", "two"]);
    expect(opts.body.itineraries[0]).toEqual({
      id: "it1",
      dayNumber: 1,
      days: "1",
      locationId: "loc123",
      hotelId: "hot456",
      itineraryTitle: "Day 1",
      roomAllocations: [
        {
          roomTypeId: "rt1",
          occupancyTypeId: "occ2",
          mealPlanId: "mp3",
          quantity: 2,
          customRoomType: "Deluxe Room",
        },
      ],
    });
  });
});
