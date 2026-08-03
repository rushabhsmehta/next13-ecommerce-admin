/**
 * Single source of truth for inquiry status values, labels, and options.
 * Import from here instead of redeclaring in each file.
 */

export const INQUIRY_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "HOT_QUERY",
  "QUERY_SENT",
  "ASKED_TO_SUPPLIER",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING: "New",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  HOT_QUERY: "Hot Query",
  QUERY_SENT: "Query Sent",
  ASKED_TO_SUPPLIER: "Asked to Supplier",
};

/** { value, label } pairs for use in Select / DropdownMenu components. */
export const INQUIRY_STATUS_OPTIONS = INQUIRY_STATUSES.map((value) => ({
  value,
  label: INQUIRY_STATUS_LABELS[value],
}));

/** Same as INQUIRY_STATUS_OPTIONS but prepended with the "All" option. */
export const INQUIRY_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Status" },
  ...INQUIRY_STATUS_OPTIONS,
];

/** Terminal workflow statuses — excluded from Pending/Live lifecycle buckets. */
export const TERMINAL_INQUIRY_STATUSES: InquiryStatus[] = ["CONFIRMED", "CANCELLED"];

/** TPQ-based list buckets (not stored on Inquiry.status). */
export const INQUIRY_LIFECYCLES = ["pending", "live", "all"] as const;

export type InquiryLifecycle = (typeof INQUIRY_LIFECYCLES)[number];

export const INQUIRY_LIFECYCLE_LABELS: Record<InquiryLifecycle, string> = {
  pending: "Pending",
  live: "Live",
  all: "All",
};

export const INQUIRY_LIFECYCLE_OPTIONS = INQUIRY_LIFECYCLES.map((value) => ({
  value,
  label: INQUIRY_LIFECYCLE_LABELS[value],
}));

export function normalizeInquiryLifecycle(
  value?: string | null
): InquiryLifecycle {
  const key = (value || "").trim().toLowerCase();
  if (key === "pending" || key === "live" || key === "all") return key;
  return "all";
}

/**
 * Prisma where fragment for Pending / Live / All.
 * Pending = no linked tour package query and not confirmed/cancelled.
 * Live = has ≥1 linked tour package query and not confirmed/cancelled.
 * `all` / unrecognized → {}.
 */
export function buildInquiryLifecycleWhere(
  lifecycle?: string | null
): {
  tourPackageQueries?: { none: object } | { some: object };
  status?: { notIn: string[] };
} {
  const key = normalizeInquiryLifecycle(lifecycle);
  if (key === "pending") {
    return {
      tourPackageQueries: { none: {} },
      status: { notIn: [...TERMINAL_INQUIRY_STATUSES] },
    };
  }
  if (key === "live") {
    return {
      tourPackageQueries: { some: {} },
      status: { notIn: [...TERMINAL_INQUIRY_STATUSES] },
    };
  }
  return {};
}

/**
 * Resolve lifecycle query param for list endpoints.
 * Prefer explicit `lifecycle`; map legacy `noTourPackageQuery=1` → pending;
 * otherwise use `defaultLifecycle` (dashboard/CRM default: pending).
 */
export function resolveInquiryLifecycleParam(options: {
  lifecycle?: string | null;
  noTourPackageQuery?: boolean;
  defaultLifecycle?: InquiryLifecycle;
}): InquiryLifecycle {
  const explicit = (options.lifecycle || "").trim().toLowerCase();
  if (explicit === "pending" || explicit === "live" || explicit === "all") {
    return explicit;
  }
  if (options.noTourPackageQuery) return "pending";
  return options.defaultLifecycle ?? "all";
}

/** Display badge for a row: Pending / Live, or null when terminal. */
export function getInquiryLifecycleBadge(
  hasTourPackageQuery: boolean,
  status: string
): "Pending" | "Live" | null {
  const upper = (status || "").toUpperCase();
  if (
    TERMINAL_INQUIRY_STATUSES.includes(upper as InquiryStatus) ||
    upper === "COMPLETED"
  ) {
    return null;
  }
  return hasTourPackageQuery ? "Live" : "Pending";
}
