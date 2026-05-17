import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export const REPORT_KINDS = [
  "upcoming-trips",
  "inquiry-summary",
  "confirmed-queries",
  "unconfirmed-queries",
  "associate-performance",
  "profit",
  "gst",
  "tds",
  "customer-statements",
  "supplier-statements",
  "bank-book",
  "cash-book",
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number];

export interface MobileReportSummary {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "bad";
}

export interface MobileReportRow {
  id: string;
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  status?: string | null;
}

export interface MobileReportDetail {
  kind: ReportKind;
  title: string;
  windowDays: number;
  generatedAt: string;
  summary: MobileReportSummary[];
  rows: MobileReportRow[];
}

export const REPORT_LABELS: Record<ReportKind, string> = {
  "upcoming-trips": "Upcoming Trips",
  "inquiry-summary": "Inquiry Summary",
  "confirmed-queries": "Confirmed Queries",
  "unconfirmed-queries": "Unconfirmed Queries",
  "associate-performance": "Associate Performance",
  profit: "Profit",
  gst: "GST",
  tds: "TDS",
  "customer-statements": "Customer Statements",
  "supplier-statements": "Supplier Statements",
  "bank-book": "Bank Book",
  "cash-book": "Cash Book",
};

export function createReportsClient(authRequest: AuthenticatedRequest) {
  return {
    getReport(kind: ReportKind, days = 90): Promise<MobileReportDetail> {
      return authRequest<MobileReportDetail>(
        `/api/mobile/reports/${kind}?days=${days}`,
        { retries: 1 }
      );
    },
  };
}

export type ReportsClient = ReturnType<typeof createReportsClient>;
