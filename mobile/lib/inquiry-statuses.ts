/** Mirrors `src/lib/inquiry-statuses.ts` for mobile bundles. */

export const INQUIRY_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "HOT_QUERY",
  "QUERY_SENT",
] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  HOT_QUERY: "Hot Query",
  QUERY_SENT: "Query Sent",
};
