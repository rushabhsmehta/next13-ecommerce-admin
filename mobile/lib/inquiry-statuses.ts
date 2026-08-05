/** Mirrors `src/lib/inquiry-statuses.ts` for mobile bundles. */

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

export const INQUIRY_STATUS_OPTIONS = INQUIRY_STATUSES.map((value) => ({
  value,
  label: INQUIRY_STATUS_LABELS[value],
}));

export const INQUIRY_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All Status" },
  ...INQUIRY_STATUS_OPTIONS,
];

export const TERMINAL_INQUIRY_STATUSES: InquiryStatus[] = ["CONFIRMED", "CANCELLED"];

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

/**
 * Staff CRM list tabs (mobile). Separate from TPQ lifecycle buckets above.
 * Follow-up = due today/overdue; Confirmed/Cancelled use Inquiry.status.
 */
export const INQUIRY_LIST_TABS = [
  "followup",
  "live",
  "confirmed",
  "cancelled",
  "all",
] as const;

export type InquiryListTab = (typeof INQUIRY_LIST_TABS)[number];

export const INQUIRY_LIST_TAB_LABELS: Record<InquiryListTab, string> = {
  followup: "Follow-up",
  live: "Live",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  all: "All",
};

export const INQUIRY_LIST_TAB_OPTIONS = INQUIRY_LIST_TABS.map((value) => ({
  value,
  label: INQUIRY_LIST_TAB_LABELS[value],
}));

export function normalizeInquiryListTab(
  value?: string | null
): InquiryListTab {
  const key = (value || "").trim().toLowerCase().replace(/[-_]/g, "");
  if (key === "followup") return "followup";
  if (key === "live") return "live";
  if (key === "confirmed") return "confirmed";
  if (key === "cancelled") return "cancelled";
  if (key === "all") return "all";
  return "followup";
}

/** Map a CRM list tab to GET /api/.../inquiries query fields. */
export function buildInquiryListTabQuery(tab: InquiryListTab): {
  lifecycle: InquiryLifecycle;
  followUpsOnly: boolean;
  status?: InquiryStatus;
} {
  switch (normalizeInquiryListTab(tab)) {
    case "followup":
      return { lifecycle: "all", followUpsOnly: true };
    case "live":
      return { lifecycle: "live", followUpsOnly: false };
    case "confirmed":
      return { lifecycle: "all", followUpsOnly: false, status: "CONFIRMED" };
    case "cancelled":
      return { lifecycle: "all", followUpsOnly: false, status: "CANCELLED" };
    case "all":
    default:
      return { lifecycle: "all", followUpsOnly: false };
  }
}
