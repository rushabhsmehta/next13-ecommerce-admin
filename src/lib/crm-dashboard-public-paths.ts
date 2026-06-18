function normalizePath(pathname: string): string {
  const p = pathname.split("?")[0] || "/";
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p || "/";
}

export function lowerPath(pathname: string): string {
  return normalizePath(pathname).toLowerCase();
}

/**
 * Public CRM pages under `(dashboard)` (Clerk proxy skips `auth.protect`).
 *
 * Must stay in sync with `isPublicRoute` in `src/proxy.ts`. These are rendered
 * unauthenticated by the internal PDF pipeline (Puppeteer has no Clerk session),
 * so the dashboard layout must NOT redirect them to /sign-in.
 */
export const CRM_PUBLIC_DASHBOARD_PREFIXES: readonly string[] = [
  "/tourpackagequerydisplay",
  "/tourpackagequeryvariantdisplay",
  "/tourpackagequerypdfgenerator",
  "/tourpackagequerypdfgeneratorwithvariants",
  "/tourpackagequeryvoucherdisplay",
  "/tourpackagepdfgenerator",
  "/tourpackagepdfgeneratorwithvariants",
];

export function isPublicDashboardPathname(pathname: string): boolean {
  const lower = lowerPath(pathname);
  return CRM_PUBLIC_DASHBOARD_PREFIXES.some(
    (pre) => lower === pre || lower.startsWith(`${pre}/`)
  );
}

/** Dashboard + voucher/PDF pages loaded by Puppeteer (no org RBAC when UA matches). */
export const CRM_PDF_AUTOMATION_PREFIXES: readonly string[] = [
  "/tourpackagepdfgenerator",
  "/tourpackagepdfgeneratorwithvariants",
  "/tourpackagequerypdfgenerator",
  "/tourpackagequerypdfgeneratorwithvariants",
  "/tourpackagequeryvoucherdisplay",
  "/tourpackagedisplay",
  "/tourpackagequerydisplay",
  "/tourpackagequeryvariantdisplay",
  "/viewpdfpage",
];

const PDF_UA_SUBSTRINGS = ["headlesschrome", "puppeteer"];

function pathMatchesAnyPrefix(lower: string, prefixes: readonly string[]): boolean {
  return prefixes.some((pre) => lower === pre || lower.startsWith(`${pre}/`));
}

/**
 * Skip CRM org-role checks for internal PDF rendering (edge proxy may still require Clerk session).
 */
export function isCrmPdfAutomationRequest(
  pathname: string,
  userAgent: string | null | undefined
): boolean {
  const lower = lowerPath(pathname);
  if (!pathMatchesAnyPrefix(lower, CRM_PDF_AUTOMATION_PREFIXES)) return false;
  const ua = (userAgent || "").toLowerCase();
  return PDF_UA_SUBSTRINGS.some((s) => ua.includes(s));
}
