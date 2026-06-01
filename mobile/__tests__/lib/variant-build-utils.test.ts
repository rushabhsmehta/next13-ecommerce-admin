import {
  formatRoomAllocationLine,
  formatTransportLine,
  lookupName,
} from "@/components/tour-queries/variant-build-utils";
import type { VariantBuildContext } from "@/lib/tour-query-pricing";

const build: VariantBuildContext = {
  itineraries: [],
  variantRoomAllocations: {},
  variantTransportDetails: {},
  variantHotelOverrides: {},
  lookups: {
    roomTypes: [{ id: "rt1", name: "Deluxe" }],
    occupancyTypes: [{ id: "oc1", name: "Double" }],
    mealPlans: [{ id: "mp1", name: "CP" }],
    vehicleTypes: [{ id: "vt1", name: "Innova" }],
  },
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
});
