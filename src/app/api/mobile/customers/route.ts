import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  assertCrmApiAccessForRequest,
  crmAccessErrorResponse,
} from "@/lib/crm-route-access";

export const dynamic = "force-dynamic";

/**
 * Mobile customer listing — search + pagination, optional associate filter.
 * Reuses the dashboard's CRM RBAC rules via `assertCrmApiAccessForRequest`.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const associatePartnerId = searchParams.get("associatePartnerId");
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (associatePartnerId) where.associatePartnerId = associatePartnerId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prismadb.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          contact: true,
          email: true,
          createdAt: true,
          associatePartner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      total,
      hasMore: offset + customers.length < total,
      nextOffset: offset + customers.length,
    });
  } catch (error) {
    console.log("[MOBILE_CUSTOMERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
