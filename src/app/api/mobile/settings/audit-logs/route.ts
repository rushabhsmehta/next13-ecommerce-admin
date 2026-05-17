import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireAuditRead } from "@/app/api/mobile/lib/assert-settings-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireAuditRead(userId);
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);
    const where = search
      ? {
          OR: [
            { entityType: { contains: search } },
            { action: { contains: search } },
            { userEmail: { contains: search } },
            { userName: { contains: search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      prismadb.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prismadb.auditLog.count({ where }),
    ]);

    return NextResponse.json({ auditLogs: rows, total, hasMore: offset + rows.length < total, nextOffset: offset + rows.length });
  } catch (error) {
    console.log("[MOBILE_SETTINGS_AUDIT_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

