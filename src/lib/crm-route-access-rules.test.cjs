const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

require("ts-node/register/transpile-only");

const {
  CRM_PUBLIC_DASHBOARD_PREFIXES,
  CRM_PDF_AUTOMATION_PREFIXES,
  isCrmPdfAutomationRequest,
  isPublicDashboardPathname,
  lowerPath,
} = require("./crm-dashboard-public-paths.ts");

/** Dashboard pages rendered by Puppeteer for mobile/server PDF jobs. */
const PUPPETEER_DASHBOARD_SEGMENTS = [
  "tourPackageQueryDisplay",
  "tourPackageQueryVariantDisplay",
  "tourPackageQueryPDFGenerator",
  "tourPackageQueryPDFGeneratorWithVariants",
  "tourPackageQueryVoucherDisplay",
  "tourPackagePDFGenerator",
  "tourPackagePDFGeneratorWithVariants",
];

const SAMPLE_ID = "tpq-test-1779556960627";
const HEADLESS_UA = "Mozilla/5.0 (compatible; HeadlessChrome) AagamMobilePDF";

function dashboardPath(segment) {
  return `/${segment}/${SAMPLE_ID}`;
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", "..", relativePath), "utf8");
}

test("Puppeteer dashboard paths are public (no sign-in redirect in dashboard layout)", () => {
  for (const segment of PUPPETEER_DASHBOARD_SEGMENTS) {
    const pathname = dashboardPath(segment);
    assert.equal(
      isPublicDashboardPathname(pathname),
      true,
      `expected isPublicDashboardPathname("${pathname}") to be true`
    );
  }
});

test("tour query voucher path is recognized for PDF automation RBAC bypass", () => {
  const pathname = dashboardPath("tourPackageQueryVoucherDisplay");
  assert.equal(
    isCrmPdfAutomationRequest(pathname, HEADLESS_UA),
    true,
    "voucher display must bypass org RBAC for HeadlessChrome PDF jobs"
  );
  assert.equal(
    isCrmPdfAutomationRequest(pathname, "Mozilla/5.0 Chrome/120"),
    false,
    "normal browsers must not bypass RBAC on voucher display"
  );
});

test("CRM_PUBLIC_DASHBOARD_PREFIXES covers every Puppeteer dashboard segment", () => {
  for (const segment of PUPPETEER_DASHBOARD_SEGMENTS) {
    const lower = lowerPath(dashboardPath(segment));
    const covered = CRM_PUBLIC_DASHBOARD_PREFIXES.some(
      (prefix) => lower === prefix || lower.startsWith(`${prefix}/`)
    );
    assert.equal(
      covered,
      true,
      `CRM_PUBLIC_DASHBOARD_PREFIXES missing coverage for ${segment}`
    );
  }
});

test("CRM_PDF_AUTOMATION_PREFIXES covers every Puppeteer dashboard segment", () => {
  for (const segment of PUPPETEER_DASHBOARD_SEGMENTS) {
    const lower = lowerPath(dashboardPath(segment));
    const covered = CRM_PDF_AUTOMATION_PREFIXES.some(
      (prefix) => lower === prefix || lower.startsWith(`${prefix}/`)
    );
    assert.equal(
      covered,
      true,
      `CRM_PDF_AUTOMATION_PREFIXES missing coverage for ${segment}`
    );
  }
});

test("proxy.ts public routes stay in sync with Puppeteer dashboard segments", () => {
  const proxySource = readRepoFile("src/proxy.ts");
  for (const segment of PUPPETEER_DASHBOARD_SEGMENTS) {
    const pattern = `"/${segment}/(.*)"`;
    assert.ok(
      proxySource.includes(pattern),
      `src/proxy.ts isPublicRoute must include ${pattern}`
    );
  }
});

test("app-shell chromeless prefixes stay in sync with public dashboard prefixes", () => {
  const appShellSource = readRepoFile("src/components/app-shell.tsx");
  for (const prefix of CRM_PUBLIC_DASHBOARD_PREFIXES) {
    assert.ok(
      appShellSource.includes(`"${prefix}"`),
      `app-shell CHROMELESS_PREFIXES must include "${prefix}"`
    );
  }
});
