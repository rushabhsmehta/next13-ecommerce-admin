import type { AppRole } from "@/lib/authz";
import { roleAtLeast } from "@/lib/authz";
import {
  CRM_PDF_AUTOMATION_PREFIXES,
  CRM_PUBLIC_DASHBOARD_PREFIXES,
  isCrmPdfAutomationRequest,
  isPublicDashboardPathname,
  lowerPath,
} from "@/lib/crm-dashboard-public-paths";

export {
  CRM_PDF_AUTOMATION_PREFIXES,
  CRM_PUBLIC_DASHBOARD_PREFIXES,
  isCrmPdfAutomationRequest,
  isPublicDashboardPathname,
  lowerPath,
};

/**
 * Longest-prefix wins. Each path must start with `prefix` (lowercase-normalized match).
 * OWNER always passes in `canAccessDashboardPath` before rules are evaluated.
 */
type RouteRule = { prefix: string; minRole: AppRole };

const DASHBOARD_RULES: RouteRule[] = [
  // OWNER-only (longer / more specific first)
  { prefix: "/settings/organization", minRole: "OWNER" },
  { prefix: "/settings/mobile-access", minRole: "OWNER" },

  // ADMIN
  { prefix: "/reports/associateperformance", minRole: "ADMIN" },
  { prefix: "/associate-partners", minRole: "ADMIN" },
  { prefix: "/operational-staff", minRole: "ADMIN" },
  { prefix: "/audit-logs", minRole: "ADMIN" },
  { prefix: "/whatsapp", minRole: "ADMIN" },
  { prefix: "/travel-users", minRole: "ADMIN" },
  { prefix: "/chat-management", minRole: "ADMIN" },
  { prefix: "/settings/units", minRole: "ADMIN" },
  { prefix: "/settings/tax-slabs", minRole: "ADMIN" },
  { prefix: "/settings/invoice", minRole: "ADMIN" },
  { prefix: "/settings/tds", minRole: "ADMIN" },

  // FINANCE (ledger paths before parent /customers, /suppliers)
  { prefix: "/customers/ledger", minRole: "FINANCE" },
  { prefix: "/suppliers/ledger", minRole: "FINANCE" },
  { prefix: "/accounts", minRole: "FINANCE" },
  { prefix: "/fetchaccounts", minRole: "FINANCE" },
  { prefix: "/sales", minRole: "FINANCE" },
  { prefix: "/purchases", minRole: "FINANCE" },
  { prefix: "/receipts", minRole: "FINANCE" },
  { prefix: "/payments", minRole: "FINANCE" },
  { prefix: "/transfers", minRole: "FINANCE" },
  { prefix: "/incomes", minRole: "FINANCE" },
  { prefix: "/expenses", minRole: "FINANCE" },
  { prefix: "/sale-returns", minRole: "FINANCE" },
  { prefix: "/purchase-returns", minRole: "FINANCE" },
  { prefix: "/cash-book", minRole: "FINANCE" },
  { prefix: "/bank-book", minRole: "FINANCE" },
  { prefix: "/cashaccounts", minRole: "FINANCE" },
  { prefix: "/bankaccounts", minRole: "FINANCE" },
  { prefix: "/income-categories", minRole: "FINANCE" },
  { prefix: "/expense-categories", minRole: "FINANCE" },
  { prefix: "/tds", minRole: "FINANCE" },
  { prefix: "/ledger", minRole: "FINANCE" },

  // OPERATIONS — catalog, pricing, master data, customers/suppliers (non-ledger)
  { prefix: "/settings/meal-plans", minRole: "OPERATIONS" },
  { prefix: "/settings/room-types", minRole: "OPERATIONS" },
  { prefix: "/settings/occupancy-types", minRole: "OPERATIONS" },
  { prefix: "/settings/vehicle-types", minRole: "OPERATIONS" },
  { prefix: "/settings/pricing-attributes", minRole: "OPERATIONS" },
  { prefix: "/settings/pricing-components", minRole: "OPERATIONS" },
  { prefix: "/locations-suppliers", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequeryfrominquiry", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequeryfromtourpackage", minRole: "OPERATIONS" },
  { prefix: "/tourpackagefromtourpackagequery", minRole: "OPERATIONS" },
  { prefix: "/tourpackagecreatecopy", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequerycreatecopy", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequeryhotelupdate", minRole: "OPERATIONS" },
  { prefix: "/transport-pricing", minRole: "OPERATIONS" },
  { prefix: "/export-contacts", minRole: "OPERATIONS" },
  { prefix: "/export", minRole: "OPERATIONS" },
  { prefix: "/follow-ups", minRole: "OPERATIONS" },
  { prefix: "/website-management", minRole: "OPERATIONS" },
  { prefix: "/hotel-pricing", minRole: "OPERATIONS" },
  { prefix: "/flight-tickets", minRole: "OPERATIONS" },
  { prefix: "/locations", minRole: "OPERATIONS" },
  { prefix: "/destinations", minRole: "OPERATIONS" },
  { prefix: "/hotels", minRole: "OPERATIONS" },
  { prefix: "/itinerariesmaster", minRole: "OPERATIONS" },
  { prefix: "/itineraries", minRole: "OPERATIONS" },
  { prefix: "/activitiesmaster", minRole: "OPERATIONS" },
  { prefix: "/activities", minRole: "OPERATIONS" },
  { prefix: "/tourpackages", minRole: "OPERATIONS" },
  { prefix: "/customers", minRole: "OPERATIONS" },
  { prefix: "/suppliers", minRole: "OPERATIONS" },

  { prefix: "/tourpackagequerypdfgeneratorwithvariants", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequerypdfgenerator", minRole: "OPERATIONS" },
  { prefix: "/tourpackagepdfgeneratorwithvariants", minRole: "OPERATIONS" },
  { prefix: "/tourpackagepdfgenerator", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequeryvoucherdisplay", minRole: "OPERATIONS" },
  { prefix: "/tourpackagequeryvariantdisplay", minRole: "VIEWER" },
  { prefix: "/tourpackagequerydisplay", minRole: "VIEWER" },
  { prefix: "/tourpackagedisplay", minRole: "VIEWER" },
  { prefix: "/viewpdfpage", minRole: "VIEWER" },

  // VIEWER — default CRM entry / inquiry workflows
  { prefix: "/inquiries", minRole: "VIEWER" },
  { prefix: "/tourpackagequery", minRole: "VIEWER" },
  { prefix: "/todos", minRole: "VIEWER" },
  { prefix: "/reports", minRole: "VIEWER" },
  { prefix: "/travel", minRole: "VIEWER" },
];

const SORTED_DASHBOARD_RULES = [...DASHBOARD_RULES].sort((a, b) => b.prefix.length - a.prefix.length);

export function getMinimumRoleForPathname(pathname: string): AppRole | null {
  const lower = lowerPath(pathname);
  for (const rule of SORTED_DASHBOARD_RULES) {
    if (lower === rule.prefix || lower.startsWith(`${rule.prefix}/`)) {
      return rule.minRole;
    }
  }
  return null;
}

export function canAccessDashboardPath(
  role: AppRole | null | undefined,
  pathname: string,
  opts?: { skipPdfAutomation?: boolean; userAgent?: string | null }
): boolean {
  if (!opts?.skipPdfAutomation && isCrmPdfAutomationRequest(pathname, opts?.userAgent)) {
    return true;
  }
  if (role === "OWNER") return true;
  const required = getMinimumRoleForPathname(pathname);
  if (required === null) {
    // Unknown dashboard URL: deny non-owner (forces new routes to add explicit rules)
    return false;
  }
  return roleAtLeast(role, required);
}

/** API paths that must not go through CRM org RBAC (public, mobile, travel, webhooks, …). */
export const CRM_API_RBAC_EXCLUDED_PREFIXES: readonly string[] = [
  "/api/auth",
  "/api/me",
  "/api/travel",
  "/api/mobile",
  "/api/whatsapp/webhook",
  "/api/internal",
  "/api/cron",
  "/api/mcp",
  "/api/website-inquiry",
  "/api/tourpackagebyslug",
  "/api/debug",
  "/api/test-twilio",
  "/api/push",
  "/api/config",
  "/api/chat", // travel app chat — separate auth
  "/api/uploads",
  "/api/generate-pdf",
  "/api/ops",
];

const SORTED_API_EXCLUSIONS = [...CRM_API_RBAC_EXCLUDED_PREFIXES].sort((a, b) => b.length - a.length);

export function isCrmApiRbacExcludedPath(apiPathname: string): boolean {
  const lower = lowerPath(apiPathname);
  for (const ex of SORTED_API_EXCLUSIONS) {
    if (lower === ex || lower.startsWith(`${ex}/`)) return true;
  }
  return false;
}

/**
 * Map `/api/foo/bar` → `/foo/bar` for reuse of dashboard prefix rules.
 */
export function apiPathToDashboardPathForRbac(apiPathname: string): string | null {
  const lower = lowerPath(apiPathname);
  if (!lower.startsWith("/api/")) return null;
  const tail = lower.slice(4); // "/api".length
  if (!tail || tail === "/") return "/";
  return tail.startsWith("/") ? tail : `/${tail}`;
}

export function canAccessApiPath(
  role: AppRole | null | undefined,
  apiPathname: string,
  opts?: { userAgent?: string | null }
): boolean {
  const lower = lowerPath(apiPathname);
  if (isCrmApiRbacExcludedPath(lower)) return true;
  const mapped = apiPathToDashboardPathForRbac(lower);
  if (!mapped) return false;
  return canAccessDashboardPath(role, mapped, { userAgent: opts?.userAgent });
}
