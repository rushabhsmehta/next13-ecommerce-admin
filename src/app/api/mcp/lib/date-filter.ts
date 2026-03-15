import { dateToUtc } from "@/lib/timezone-utils";

/** Build a Prisma date range filter from optional start/end date strings */
export function buildDateFilter(startDate?: string, endDate?: string): { gte?: Date; lte?: Date } | undefined {
  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const d = dateToUtc(startDate);
    if (d) filter.gte = d;
  }
  if (endDate) {
    const d = dateToUtc(endDate);
    if (d) {
      d.setUTCHours(23, 59, 59, 999);
      filter.lte = d;
    }
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}
