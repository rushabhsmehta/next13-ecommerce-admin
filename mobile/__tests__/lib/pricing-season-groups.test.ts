import {
  fmtPricingDateRange,
  groupPricingBySeason,
  type PricingGroupRow,
  type SeasonalPeriodLookup,
} from "../../lib/pricing-season-groups";

const beachPeriods: SeasonalPeriodLookup[] = [
  {
    id: "winter",
    name: "Winter Peak Season",
    seasonType: "PEAK_SEASON",
    startMonth: 10,
    startDay: 1,
    endMonth: 3,
    endDay: 31,
  },
  {
    id: "summer",
    name: "Monsoon Off Season",
    seasonType: "OFF_SEASON",
    startMonth: 4,
    startDay: 1,
    endMonth: 9,
    endDay: 30,
  },
];

function row(overrides: Partial<PricingGroupRow> & Pick<PricingGroupRow, "id">): PricingGroupRow {
  return {
    startDate: "2026-04-01T00:00:00.000Z",
    endDate: "2026-09-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupPricingBySeason", () => {
  it("groups rows with the same date range into one section", () => {
    const rows = [
      row({ id: "a", startDate: "2026-04-01T00:00:00.000Z", endDate: "2026-09-30T00:00:00.000Z" }),
      row({ id: "b", startDate: "2026-04-01T00:00:00.000Z", endDate: "2026-09-30T00:00:00.000Z" }),
      row({ id: "c", startDate: "2026-10-01T00:00:00.000Z", endDate: "2027-03-31T00:00:00.000Z" }),
      row({ id: "d", startDate: "2026-10-01T00:00:00.000Z", endDate: "2027-03-31T00:00:00.000Z" }),
    ];

    const groups = groupPricingBySeason(rows, beachPeriods);

    expect(groups).toHaveLength(2);
    expect(groups[0].items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(groups[1].items.map((item) => item.id)).toEqual(["c", "d"]);
  });

  it("uses seasonalPeriodName when present", () => {
    const groups = groupPricingBySeason(
      [
        row({
          id: "a",
          seasonalPeriodName: "Winter Peak Season",
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2027-03-31T00:00:00.000Z",
        }),
      ],
      beachPeriods
    );

    expect(groups[0].title).toBe("Winter Peak Season");
  });

  it("resolves title from linked locationSeasonalPeriodId", () => {
    const groups = groupPricingBySeason(
      [
        row({
          id: "a",
          locationSeasonalPeriodId: "summer",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-09-30T00:00:00.000Z",
        }),
      ],
      beachPeriods
    );

    expect(groups[0].title).toBe("Monsoon Off Season");
  });

  it("infers period name from matching date template", () => {
    const groups = groupPricingBySeason(
      [
        row({
          id: "a",
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2027-03-31T00:00:00.000Z",
        }),
      ],
      beachPeriods
    );

    expect(groups[0].title).toBe("Winter Peak Season");
  });

  it("falls back to formatted date range when no period matches", () => {
    const groups = groupPricingBySeason([
      row({
        id: "a",
        startDate: "2026-05-15T00:00:00.000Z",
        endDate: "2026-06-20T00:00:00.000Z",
      }),
    ]);

    expect(groups[0].title).toBe(
      fmtPricingDateRange("2026-05-15T00:00:00.000Z", "2026-06-20T00:00:00.000Z")
    );
  });

  it("keeps different years in separate groups even with same period id", () => {
    const groups = groupPricingBySeason(
      [
        row({
          id: "a",
          locationSeasonalPeriodId: "winter",
          startDate: "2025-10-01T00:00:00.000Z",
          endDate: "2026-03-31T00:00:00.000Z",
        }),
        row({
          id: "b",
          locationSeasonalPeriodId: "winter",
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2027-03-31T00:00:00.000Z",
        }),
      ],
      beachPeriods
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].key).not.toBe(groups[1].key);
  });

  it("sorts groups by earliest start date", () => {
    const groups = groupPricingBySeason(
      [
        row({
          id: "winter",
          startDate: "2026-10-01T00:00:00.000Z",
          endDate: "2027-03-31T00:00:00.000Z",
        }),
        row({
          id: "summer",
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-09-30T00:00:00.000Z",
        }),
      ],
      beachPeriods
    );

    expect(groups[0].items[0].id).toBe("summer");
    expect(groups[1].items[0].id).toBe("winter");
  });
});
