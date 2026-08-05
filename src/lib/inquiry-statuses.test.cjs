const assert = require("node:assert/strict");
const test = require("node:test");

require("ts-node/register/transpile-only");

const {
  INQUIRY_STATUS_LABELS,
  buildInquiryLifecycleWhere,
  buildInquiryListTabQuery,
  getInquiryLifecycleBadge,
  normalizeInquiryLifecycle,
  normalizeInquiryListTab,
  resolveInquiryLifecycleParam,
} = require("./inquiry-statuses.ts");

test("PENDING status label is New", () => {
  assert.equal(INQUIRY_STATUS_LABELS.PENDING, "New");
});

test("normalizeInquiryLifecycle", () => {
  assert.equal(normalizeInquiryLifecycle("PENDING"), "pending");
  assert.equal(normalizeInquiryLifecycle("Live"), "live");
  assert.equal(normalizeInquiryLifecycle(undefined), "all");
  assert.equal(normalizeInquiryLifecycle("bogus"), "all");
});

test("buildInquiryLifecycleWhere pending", () => {
  assert.deepEqual(buildInquiryLifecycleWhere("pending"), {
    tourPackageQueries: { none: {} },
    status: { notIn: ["CONFIRMED", "CANCELLED"] },
  });
});

test("buildInquiryLifecycleWhere live", () => {
  assert.deepEqual(buildInquiryLifecycleWhere("live"), {
    tourPackageQueries: { some: {} },
    status: { notIn: ["CONFIRMED", "CANCELLED"] },
  });
});

test("buildInquiryLifecycleWhere all", () => {
  assert.deepEqual(buildInquiryLifecycleWhere("all"), {});
  assert.deepEqual(buildInquiryLifecycleWhere(undefined), {});
});

test("resolveInquiryLifecycleParam", () => {
  assert.equal(
    resolveInquiryLifecycleParam({ defaultLifecycle: "pending" }),
    "pending"
  );
  assert.equal(
    resolveInquiryLifecycleParam({
      noTourPackageQuery: true,
      defaultLifecycle: "all",
    }),
    "pending"
  );
  assert.equal(
    resolveInquiryLifecycleParam({
      lifecycle: "live",
      noTourPackageQuery: true,
    }),
    "live"
  );
});

test("getInquiryLifecycleBadge", () => {
  assert.equal(getInquiryLifecycleBadge(false, "PENDING"), "Pending");
  assert.equal(getInquiryLifecycleBadge(true, "HOT_QUERY"), "Live");
  assert.equal(getInquiryLifecycleBadge(true, "CONFIRMED"), null);
  assert.equal(getInquiryLifecycleBadge(false, "CANCELLED"), null);
});

test("normalizeInquiryListTab", () => {
  assert.equal(normalizeInquiryListTab("Follow-up"), "followup");
  assert.equal(normalizeInquiryListTab("CONFIRMED"), "confirmed");
  assert.equal(normalizeInquiryListTab(undefined), "followup");
});

test("buildInquiryListTabQuery", () => {
  assert.deepEqual(buildInquiryListTabQuery("followup"), {
    lifecycle: "all",
    followUpsOnly: true,
  });
  assert.deepEqual(buildInquiryListTabQuery("live"), {
    lifecycle: "live",
    followUpsOnly: false,
  });
  assert.deepEqual(buildInquiryListTabQuery("confirmed"), {
    lifecycle: "all",
    followUpsOnly: false,
    status: "CONFIRMED",
  });
  assert.deepEqual(buildInquiryListTabQuery("cancelled"), {
    lifecycle: "all",
    followUpsOnly: false,
    status: "CANCELLED",
  });
  assert.deepEqual(buildInquiryListTabQuery("all"), {
    lifecycle: "all",
    followUpsOnly: false,
  });
});
