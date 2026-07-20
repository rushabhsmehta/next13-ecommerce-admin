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
  PENDING: "Pending",
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
