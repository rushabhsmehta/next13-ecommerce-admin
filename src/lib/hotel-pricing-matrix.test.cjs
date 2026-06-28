const assert = require("node:assert/strict");
const test = require("node:test");

require("ts-node/register/transpile-only");

const {
  groupPricingIntoSheets,
  flattenSheetToRows,
  sheetKey,
  detectGaps,
  filterSheetsForSeason,
  groupSheetsBySeason,
  applyPercentToSheet,
} = require("./hotel-pricing-matrix.ts");

const occupancyTypes = [
  { id: "occ-double", name: "Double Occupancy", rank: 1 },
  { id: "occ-triple", name: "Triple Occupancy", rank: 2 },
];

test("sheetKey is stable", () => {
  const key = sheetKey({
    startDate: "2026-10-01",
    endDate: "2026-11-03",
    roomTypeId: "room-1",
    mealPlanId: "meal-1",
    locationSeasonalPeriodId: "season-1",
  });
  assert.equal(key, "2026-10-01|2026-11-03|room-1|meal-1|season-1");
});

test("groupPricingIntoSheets collapses occupancy rows into one sheet", () => {
  const flat = [
    {
      id: "p1",
      hotelId: "h1",
      startDate: "2026-10-01",
      endDate: "2026-11-03",
      price: 5500,
      roomTypeId: "room-1",
      occupancyTypeId: "occ-double",
      mealPlanId: "meal-1",
      locationSeasonalPeriodId: "season-1",
      roomType: { id: "room-1", name: "STANDARD BASE" },
      mealPlan: { id: "meal-1", code: "MAPAI BD", name: "MAPAI" },
      locationSeasonalPeriod: { id: "season-1", name: "Winter Peak", seasonType: "PEAK_SEASON" },
    },
    {
      id: "p2",
      hotelId: "h1",
      startDate: "2026-10-01",
      endDate: "2026-11-03",
      price: 6500,
      roomTypeId: "room-1",
      occupancyTypeId: "occ-triple",
      mealPlanId: "meal-1",
      locationSeasonalPeriodId: "season-1",
      roomType: { id: "room-1", name: "STANDARD BASE" },
      mealPlan: { id: "meal-1", code: "MAPAI BD", name: "MAPAI" },
      locationSeasonalPeriod: { id: "season-1", name: "Winter Peak", seasonType: "PEAK_SEASON" },
    },
  ];

  const sheets = groupPricingIntoSheets(flat, occupancyTypes);
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].occupancyPrices.length, 2);
  assert.equal(sheets[0].occupancyPrices[0].price, 5500);
  assert.equal(sheets[0].rowIds.length, 2);
});

test("flattenSheetToRows expands sheet back to flat rows", () => {
  const rows = flattenSheetToRows({
    hotelId: "h1",
    startDate: "2026-10-01",
    endDate: "2026-11-03",
    roomTypeId: "room-1",
    mealPlanId: "meal-1",
    locationSeasonalPeriodId: "season-1",
    occupancyPrices: [
      { occupancyTypeId: "occ-double", price: 5500 },
      { occupancyTypeId: "occ-triple", price: 6500 },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].occupancyTypeId, "occ-double");
  assert.equal(rows[1].price, 6500);
});

test("detectGaps finds missing occupancies", () => {
  const sheets = groupPricingIntoSheets(
    [
      {
        id: "p1",
        hotelId: "h1",
        startDate: "2026-10-01",
        endDate: "2026-11-03",
        price: 5500,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-double",
        mealPlanId: "meal-1",
      },
    ],
    occupancyTypes
  );
  const gaps = detectGaps(sheets[0], occupancyTypes);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].occupancyTypeId, "occ-triple");
});

test("filterSheetsForSeason filters by seasonal period id", () => {
  const sheets = groupPricingIntoSheets(
    [
      {
        id: "p1",
        hotelId: "h1",
        startDate: "2026-10-01",
        endDate: "2026-11-03",
        price: 5500,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-double",
        mealPlanId: "meal-1",
        locationSeasonalPeriodId: "season-1",
      },
      {
        id: "p2",
        hotelId: "h1",
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        price: 7000,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-double",
        mealPlanId: "meal-1",
        locationSeasonalPeriodId: "season-2",
      },
    ],
    occupancyTypes
  );
  const filtered = filterSheetsForSeason(sheets, "season-1");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].startDate, "2026-10-01");
});

test("groupSheetsBySeason groups sheets under season headers", () => {
  const sheets = groupPricingIntoSheets(
    [
      {
        id: "p1",
        hotelId: "h1",
        startDate: "2026-10-01",
        endDate: "2026-11-03",
        price: 5500,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-double",
        mealPlanId: "meal-1",
        locationSeasonalPeriodId: "season-1",
        locationSeasonalPeriod: { id: "season-1", name: "Winter Peak", seasonType: "PEAK_SEASON" },
      },
    ],
    occupancyTypes
  );
  const groups = groupSheetsBySeason(sheets);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].seasonName, "Winter Peak");
});

test("applyPercentToSheet adjusts all prices", () => {
  const sheets = groupPricingIntoSheets(
    [
      {
        id: "p1",
        hotelId: "h1",
        startDate: "2026-10-01",
        endDate: "2026-11-03",
        price: 5000,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-double",
        mealPlanId: "meal-1",
      },
      {
        id: "p2",
        hotelId: "h1",
        startDate: "2026-10-01",
        endDate: "2026-11-03",
        price: 6000,
        roomTypeId: "room-1",
        occupancyTypeId: "occ-triple",
        mealPlanId: "meal-1",
      },
    ],
    occupancyTypes
  );
  const adjusted = applyPercentToSheet(sheets[0], 10);
  assert.equal(adjusted.occupancyPrices.find((o) => o.occupancyTypeId === "occ-double").price, 5500);
  assert.equal(adjusted.occupancyPrices.find((o) => o.occupancyTypeId === "occ-triple").price, 6600);
});
