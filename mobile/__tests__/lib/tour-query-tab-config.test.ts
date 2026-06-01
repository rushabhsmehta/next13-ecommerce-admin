import {
  fieldPathToTab,
  firstTabForFieldErrors,
  parseTourQueryTab,
} from "@/components/tour-queries/tab-config";

describe("parseTourQueryTab", () => {
  it("returns basic for unknown values", () => {
    expect(parseTourQueryTab(undefined)).toBe("basic");
    expect(parseTourQueryTab("unknown")).toBe("basic");
  });

  it("accepts valid tab ids", () => {
    expect(parseTourQueryTab("pricing")).toBe("pricing");
    expect(parseTourQueryTab("itinerary")).toBe("itinerary");
    expect(parseTourQueryTab("hotels")).toBe("hotels");
  });
});

describe("fieldPathToTab", () => {
  it("maps itinerary field paths", () => {
    expect(fieldPathToTab("itineraries.0.itineraryTitle")).toBe("itinerary");
  });

  it("maps hotel and room allocation paths", () => {
    expect(fieldPathToTab("itineraries.0.roomAllocations.0.occupancyTypeId")).toBe(
      "hotels"
    );
    expect(fieldPathToTab("itineraries.0.hotelId")).toBe("hotels");
  });

  it("maps guest fields", () => {
    expect(fieldPathToTab("customerName")).toBe("guests");
  });

  it("maps trip fields", () => {
    expect(fieldPathToTab("tourStartsFrom")).toBe("trip");
    expect(fieldPathToTab("pickup_location")).toBe("trip");
  });

  it("maps pricing fields", () => {
    expect(fieldPathToTab("totalPrice")).toBe("pricing");
  });
});

describe("firstTabForFieldErrors", () => {
  it("returns first tab with errors", () => {
    expect(
      firstTabForFieldErrors({
        totalPrice: ["Required"],
        customerName: ["Required"],
      })
    ).toBe("pricing");
  });

  it("returns null when no errors", () => {
    expect(firstTabForFieldErrors({})).toBeNull();
  });
});
