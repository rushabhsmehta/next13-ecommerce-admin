import {
  cloneVariantBuildDraft,
  copyFirstDayBuildToAllDays,
  createVariantBuildDraft,
  formatRoomAllocationLine,
  formatTransportLine,
  lookupName,
} from "@/components/tour-queries/variant-build-utils";
import type {
  VariantBuildContext,
  VariantBuildDraft,
  VariantComparisonItem,
} from "@/lib/tour-query-pricing";

const build: VariantBuildContext = {
  itineraries: [
    { id: "day1", dayNumber: 1, itineraryTitle: null, locationId: null, hotel: null },
    { id: "day2", dayNumber: 2, itineraryTitle: null, locationId: null, hotel: null },
  ],
  variantRoomAllocations: {
    source1: {
      day1: [
        {
          roomTypeId: "rt1",
          occupancyTypeId: "oc1",
          mealPlanId: "mp1",
          quantity: 2,
          extraBeds: [{ occupancyTypeId: "oc1", quantity: 1 }],
        },
      ],
    },
  },
  variantTransportDetails: {
    source1: {
      day1: [{ vehicleTypeId: "vt1", quantity: 1, description: "Airport pickup" }],
    },
  },
  variantHotelOverrides: {},
  lookups: {
    roomTypes: [{ id: "rt1", name: "Deluxe" }],
    occupancyTypes: [{ id: "oc1", name: "Double" }],
    mealPlans: [{ id: "mp1", name: "CP" }],
    vehicleTypes: [{ id: "vt1", name: "Innova" }],
  },
};

const variant: VariantComparisonItem = {
  id: "snapshot1",
  sourceVariantId: "source1",
  name: "Luxury",
  sortOrder: 0,
  isConfirmed: false,
  pricing: null,
  hotelSnapshots: [],
};

describe("variant-build-utils", () => {
  it("formats room allocation lines with lookup labels", () => {
    const line = formatRoomAllocationLine(
      {
        roomTypeId: "rt1",
        occupancyTypeId: "oc1",
        mealPlanId: "mp1",
        quantity: 2,
      },
      build
    );
    expect(line).toContain("2×");
    expect(line).toContain("Deluxe");
    expect(line).toContain("Double");
  });

  it("formats transport lines", () => {
    const line = formatTransportLine(
      { vehicleTypeId: "vt1", quantity: 1, description: "Airport pickup" },
      build
    );
    expect(line).toBe("1× Innova: Airport pickup");
  });

  it("lookupName falls back safely", () => {
    expect(lookupName(build.lookups.roomTypes, "missing")).toBe("missing");
  });

  it("creates a complete variant draft with empty arrays for unconfigured days", () => {
    const draft = createVariantBuildDraft(variant, build);
    expect(draft.roomsByItinerary.day1).toHaveLength(1);
    expect(draft.roomsByItinerary.day2).toEqual([]);
    expect(draft.transportByItinerary.day2).toEqual([]);
    expect(draft.roomsByItinerary.day1).not.toBe(
      (build.variantRoomAllocations.source1 as any).day1
    );
  });

  it("copies Day 1 to every day without sharing nested references", () => {
    const source = createVariantBuildDraft(variant, build);
    const copied = copyFirstDayBuildToAllDays(source, ["day1", "day2"]);
    expect(copied.roomsByItinerary.day2).toEqual(copied.roomsByItinerary.day1);
    expect(copied.transportByItinerary.day2).toEqual(copied.transportByItinerary.day1);
    expect(copied.roomsByItinerary.day2).not.toBe(copied.roomsByItinerary.day1);
    expect(copied.roomsByItinerary.day2[0].extraBeds).not.toBe(
      copied.roomsByItinerary.day1[0].extraBeds
    );
  });

  it("deep clones a combined room and transport draft", () => {
    const source: VariantBuildDraft = createVariantBuildDraft(variant, build);
    const cloned = cloneVariantBuildDraft(source);
    cloned.roomsByItinerary.day1[0].quantity = 9;
    cloned.transportByItinerary.day1[0].description = "Changed";
    expect(source.roomsByItinerary.day1[0].quantity).toBe(2);
    expect(source.transportByItinerary.day1[0].description).toBe("Airport pickup");
  });
});
