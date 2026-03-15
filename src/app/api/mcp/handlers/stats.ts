import prismadb from "@/lib/prismadb";
import { mapPrismaError, McpError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Handlers ─────────────────────────────────────────────────────────────────

async function getStats(_rawParams: unknown) {
  let counts: [number, number, number, number, number, number, number];
  try {
    counts = await Promise.all([
      prismadb.inquiry.count(),
      prismadb.inquiry.count({ where: { status: "PENDING" } }),
      prismadb.inquiry.count({ where: { status: "CONFIRMED" } }),
      prismadb.inquiry.count({ where: { status: "CANCELLED" } }),
      prismadb.inquiry.count({ where: { status: "HOT_QUERY" } }),
      prismadb.inquiry.count({ where: { status: "QUERY_SENT" } }),
      prismadb.tourPackageQuery.count({ where: { isArchived: false } }),
    ]);
  } catch (err) {
    const pe = mapPrismaError(err);
    if (pe) throw pe;
    throw new McpError(
      "Failed to fetch dashboard statistics from the database",
      "INTERNAL_ERROR", 500,
      { cause: err instanceof Error ? err.message : String(err) }
    );
  }
  const [total, pending, confirmed, cancelled, hotQuery, querySent, totalQueries] = counts;
  return {
    inquiries: { total, pending, confirmed, cancelled, hotQuery, querySent },
    tourQueries: { total: totalQueries },
  };
}

// ── Export ────────────────────────────────────────────────────────────────────

export const statsHandlers: ToolHandlerMap = {
  get_stats: getStats,
};
