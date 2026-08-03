import {
  INQUIRY_STATUS_LABELS,
  buildInquiryLifecycleWhere,
  getInquiryLifecycleBadge,
  normalizeInquiryLifecycle,
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
