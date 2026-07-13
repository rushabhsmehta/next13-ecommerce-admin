const assert = require("node:assert/strict");
const test = require("node:test");

require("ts-node/register/transpile-only");

const {
  dateRangesOverlap,
  resolveEffectiveHotelPricing,
} = require("./hotel-effective-pricing.ts");

function d(day) {
  return new Date(Date.UTC(2026, 11, day, 12, 0, 0, 0));
}

function base(overrides = {}) {
  return {
    id: overrides.id ?? "base-1",
    hotelId: "hotel-1",
    startDate: overrides.startDate ?? d(24),
    endDate: overrides.endDate ?? d(26),
    price: overrides.price ?? 1000,
    isActive: true,
    roomTypeId: overrides.roomTypeId ?? "room-1",
    occupancyTypeId: overrides.occupancyTypeId ?? "occ-1",
    mealPlanId: overrides.mealPlanId ?? "meal-1",
    locationSeasonalPeriodId: null,
    roomType: { id: overrides.roomTypeId ?? "room-1", name: overrides.roomName ?? "Standard" },
    occupancyType: { id: overrides.occupancyTypeId ?? "occ-1", name: overrides.occupancyName ?? "Double" },
    mealPlan: { id: overrides.mealPlanId ?? "meal-1", code: "MAP", name: "MAP" },
    locationSeasonalPeriod: null,
  };
}

function special(overrides = {}) {
  return {
    id: overrides.id ?? "special-1",
    hotelId: "hotel-1",
    name: overrides.name ?? "Christmas",
    startDate: overrides.startDate ?? d(25),
    endDate: overrides.endDate ?? d(25),
    price: overrides.price ?? 2500,
    notes: overrides.notes ?? null,
    isActive: true,
    roomTypeId: overrides.roomTypeId ?? "room-1",
    occupancyTypeId: overrides.occupancyTypeId ?? "occ-1",
    mealPlanId: overrides.mealPlanId ?? "meal-1",
    roomType: { id: overrides.roomTypeId ?? "room-1", name: overrides.roomName ?? "Standard" },
    occupancyType: { id: overrides.occupancyTypeId ?? "occ-1", name: overrides.occupancyName ?? "Double" },
    mealPlan: { id: overrides.mealPlanId ?? "meal-1", code: "MAP", name: "MAP" },
  };
}

function tx(baseRows, specialRows) {
  return {
    hotelPricing: {
      findMany: async () => baseRows,
    },
    hotelSpecialDatePricing: {
      findMany: async () => specialRows,
    },
  };
}

test("dateRangesOverlap is inclusive", () => {
  assert.equal(dateRangesOverlap(d(24), d(25), d(25), d(26)), true);
  assert.equal(dateRangesOverlap(d(24), d(25), d(26), d(27)), false);
});

test("resolveEffectiveHotelPricing returns base pricing when no special date exists", async () => {
  const result = await resolveEffectiveHotelPricing(tx([base()], []), {
    hotelId: "hotel-1",
    startDate: d(24),
    endDate: d(26),
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].priceSource, "BASE");
  assert.equal(result.rows[0].price, 1000);
  assert.equal(result.warnings.length, 0);
});

test("resolveEffectiveHotelPricing returns standalone special date pricing", async () => {
  const result = await resolveEffectiveHotelPricing(tx([], [special()]), {
    hotelId: "hotel-1",
    startDate: d(25),
    endDate: d(25),
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].priceSource, "SPECIAL_DATE");
  assert.equal(result.rows[0].price, 2500);
});

test("resolveEffectiveHotelPricing keeps special dates outside partial base coverage", async () => {
  const result = await resolveEffectiveHotelPricing(
    tx(
      [base({ startDate: d(25), endDate: d(25) })],
      [special({ startDate: d(24), endDate: d(26) })]
    ),
    {
      hotelId: "hotel-1",
      startDate: d(24),
      endDate: d(26),
    }
  );

  assert.deepEqual(
    result.rows.map((row) => [
      row.startDate.toISOString().slice(0, 10),
      row.endDate.toISOString().slice(0, 10),
      row.priceSource,
      row.price,
    ]),
    [
      ["2026-12-24", "2026-12-24", "SPECIAL_DATE", 2500],
      ["2026-12-25", "2026-12-25", "SPECIAL_DATE", 2500],
      ["2026-12-26", "2026-12-26", "SPECIAL_DATE", 2500],
    ]
  );
});

test("resolveEffectiveHotelPricing segments mixed base and special date pricing", async () => {
  const result = await resolveEffectiveHotelPricing(tx([base()], [special()]), {
    hotelId: "hotel-1",
    startDate: d(24),
    endDate: d(26),
  });
  assert.deepEqual(
    result.rows.map((row) => [row.startDate.toISOString().slice(0, 10), row.endDate.toISOString().slice(0, 10), row.priceSource, row.price]),
    [
      ["2026-12-24", "2026-12-24", "BASE", 1000],
      ["2026-12-25", "2026-12-25", "SPECIAL_DATE", 2500],
      ["2026-12-26", "2026-12-26", "BASE", 1000],
    ]
  );
});

test("resolveEffectiveHotelPricing warns when a special date exists but a matching override is missing", async () => {
  const result = await resolveEffectiveHotelPricing(
    tx(
      [
        base({ id: "base-double", occupancyTypeId: "occ-double", occupancyName: "Double" }),
        base({ id: "base-triple", occupancyTypeId: "occ-triple", occupancyName: "Triple" }),
      ],
      [
        special({
          id: "special-double",
          occupancyTypeId: "occ-double",
          occupancyName: "Double",
        }),
      ]
    ),
    {
      hotelId: "hotel-1",
      startDate: d(24),
      endDate: d(26),
    }
  );
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].code, "MISSING_SPECIAL_DATE_PRICE");
  assert.equal(result.warnings[0].occupancyTypeId, "occ-triple");
});
