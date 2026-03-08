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
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING:    "Pending",
  CONFIRMED:  "Confirmed",
  CANCELLED:  "Cancelled",
  HOT_QUERY:  "Hot Query",
  QUERY_SENT: "Query Sent",
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
