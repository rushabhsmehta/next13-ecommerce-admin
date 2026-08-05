import {
  INQUIRY_STATUS_LABELS,
  buildInquiryLifecycleWhere,
  buildInquiryListTabQuery,
  getInquiryLifecycleBadge,
  normalizeInquiryLifecycle,
  normalizeInquiryListTab,
  resolveInquiryLifecycleParam,
} from "../../lib/inquiry-statuses";

describe("inquiry-statuses lifecycle", () => {
  it("labels PENDING as New", () => {
    expect(INQUIRY_STATUS_LABELS.PENDING).toBe("New");
  });

  it("normalizes lifecycle values", () => {
    expect(normalizeInquiryLifecycle("PENDING")).toBe("pending");
    expect(normalizeInquiryLifecycle("Live")).toBe("live");
    expect(normalizeInquiryLifecycle(undefined)).toBe("all");
    expect(normalizeInquiryLifecycle("bogus")).toBe("all");
  });

  it("builds pending where (no TPQ, not terminal)", () => {
    expect(buildInquiryLifecycleWhere("pending")).toEqual({
      tourPackageQueries: { none: {} },
      status: { notIn: ["CONFIRMED", "CANCELLED"] },
    });
  });

  it("builds live where (some TPQ, not terminal)", () => {
    expect(buildInquiryLifecycleWhere("live")).toEqual({
      tourPackageQueries: { some: {} },
      status: { notIn: ["CONFIRMED", "CANCELLED"] },
    });
  });

  it("builds empty where for all", () => {
    expect(buildInquiryLifecycleWhere("all")).toEqual({});
    expect(buildInquiryLifecycleWhere(undefined)).toEqual({});
  });

  it("resolves lifecycle param with defaults and legacy noTourPackageQuery", () => {
    expect(
      resolveInquiryLifecycleParam({ defaultLifecycle: "pending" })
    ).toBe("pending");
    expect(
      resolveInquiryLifecycleParam({
        noTourPackageQuery: true,
        defaultLifecycle: "all",
      })
    ).toBe("pending");
    expect(
      resolveInquiryLifecycleParam({
        lifecycle: "live",
        noTourPackageQuery: true,
      })
    ).toBe("live");
  });

  it("derives lifecycle badges", () => {
    expect(getInquiryLifecycleBadge(false, "PENDING")).toBe("Pending");
    expect(getInquiryLifecycleBadge(true, "HOT_QUERY")).toBe("Live");
    expect(getInquiryLifecycleBadge(true, "CONFIRMED")).toBeNull();
    expect(getInquiryLifecycleBadge(false, "CANCELLED")).toBeNull();
  });
});

describe("inquiry list tabs", () => {
  it("normalizes list tab values and defaults to followup", () => {
    expect(normalizeInquiryListTab("Follow-up")).toBe("followup");
    expect(normalizeInquiryListTab("follow_up")).toBe("followup");
    expect(normalizeInquiryListTab("CONFIRMED")).toBe("confirmed");
    expect(normalizeInquiryListTab("cancelled")).toBe("cancelled");
    expect(normalizeInquiryListTab(undefined)).toBe("followup");
    expect(normalizeInquiryListTab("bogus")).toBe("followup");
  });

  it("maps follow-up tab to due-follow-up query params", () => {
    expect(buildInquiryListTabQuery("followup")).toEqual({
      lifecycle: "all",
      followUpsOnly: true,
    });
  });

  it("maps live tab to live lifecycle", () => {
    expect(buildInquiryListTabQuery("live")).toEqual({
      lifecycle: "live",
      followUpsOnly: false,
    });
  });

  it("maps confirmed and cancelled tabs to inquiry status filters", () => {
    expect(buildInquiryListTabQuery("confirmed")).toEqual({
      lifecycle: "all",
      followUpsOnly: false,
      status: "CONFIRMED",
    });
    expect(buildInquiryListTabQuery("cancelled")).toEqual({
      lifecycle: "all",
      followUpsOnly: false,
      status: "CANCELLED",
    });
  });

  it("maps all tab to unrestricted lifecycle", () => {
    expect(buildInquiryListTabQuery("all")).toEqual({
      lifecycle: "all",
      followUpsOnly: false,
    });
  });
});
