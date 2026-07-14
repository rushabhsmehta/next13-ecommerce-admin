const assert = require("node:assert/strict");
const test = require("node:test");

require("ts-node/register/transpile-only");

const {
  copyFirstDayHotelForVariant,
  copyFirstDayRoomsAndTransportForVariant,
} = require("./tour-query-variant-copy.ts");

const itineraries = [{ id: "day1" }, { id: "day2" }, { id: "day3" }];

test("copyFirstDayRoomsAndTransportForVariant leaves hotel overrides untouched", () => {
  const hotelOverrides = {
    luxury: {
      day1: "hotel-1",
      day2: "hotel-2",
      day3: "hotel-3",
    },
  };

  const result = copyFirstDayRoomsAndTransportForVariant({
    variantId: "luxury",
    itineraries,
    variantRoomAllocations: {
      luxury: {
        day1: [{ roomTypeId: "room-1", extraBeds: [{ occupancyTypeId: "occ-1" }] }],
        day2: [{ roomTypeId: "room-2" }],
      },
    },
    variantTransportDetails: {
      luxury: {
        day1: [{ vehicleTypeId: "vehicle-1", description: "Pickup" }],
        day2: [{ vehicleTypeId: "vehicle-2" }],
      },
    },
  });

  assert.ok(result);
  assert.equal(result.copiedDayCount, 3);
  assert.equal("variantHotelOverrides" in result, false);
  assert.deepEqual(result.variantRoomAllocations.luxury.day2, result.variantRoomAllocations.luxury.day1);
  assert.deepEqual(result.variantTransportDetails.luxury.day3, result.variantTransportDetails.luxury.day1);
  assert.notEqual(result.variantRoomAllocations.luxury.day2, result.variantRoomAllocations.luxury.day1);
  assert.deepEqual(hotelOverrides.luxury, {
    day1: "hotel-1",
    day2: "hotel-2",
    day3: "hotel-3",
  });
});

test("copyFirstDayHotelForVariant leaves room and transport maps untouched", () => {
  const rooms = {
    luxury: {
      day1: [{ roomTypeId: "room-1" }],
      day2: [{ roomTypeId: "room-2" }],
    },
  };
  const transport = {
    luxury: {
      day1: [{ vehicleTypeId: "vehicle-1" }],
      day2: [{ vehicleTypeId: "vehicle-2" }],
    },
  };

  const result = copyFirstDayHotelForVariant({
    variantId: "luxury",
    itineraries,
    variantHotelOverrides: {
      luxury: {
        day1: "hotel-1",
        day2: "hotel-2",
      },
    },
    hotelId: "hotel-1",
  });

  assert.ok(result);
  assert.equal("variantRoomAllocations" in result, false);
  assert.equal("variantTransportDetails" in result, false);
  assert.deepEqual(result.variantHotelOverrides.luxury, {
    day1: "hotel-1",
    day2: "hotel-1",
    day3: "hotel-1",
  });
  assert.deepEqual(rooms.luxury.day2, [{ roomTypeId: "room-2" }]);
  assert.deepEqual(transport.luxury.day2, [{ vehicleTypeId: "vehicle-2" }]);
});
