import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  assertCrmApiAccessForRequest,
  crmAccessErrorResponse,
} from "@/lib/crm-route-access";

export const dynamic = "force-dynamic";

/**
 * Lightweight tour-query list for mobile. Supports search, status filter,
 * pagination. Status values:
 *   - "all" (default), "confirmed" (isFeatured=true), "draft" (isFeatured=false),
 *   - "archived" (isArchived=true)
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
    const status = (searchParams.get("status") ?? "all").toLowerCase();
    const associatePartnerId = searchParams.get("associatePartnerId");
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "25", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: Record<string, unknown> = {};
    if (associatePartnerId) where.associatePartnerId = associatePartnerId;
    if (status === "confirmed") {
      where.isFeatured = true;
      where.isArchived = false;
    } else if (status === "draft") {
      where.isFeatured = false;
      where.isArchived = false;
    } else if (status === "archived") {
      where.isArchived = true;
    } else {
      where.isArchived = false;
    }
    if (search) {
      where.OR = [
        { tourPackageQueryName: { contains: search } },
        { tourPackageQueryNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerNumber: { contains: search } },
      ];
    }

    const [queries, total] = await Promise.all([
      prismadb.tourPackageQuery.findMany({
        where,
        select: {
          id: true,
          tourPackageQueryNumber: true,
          tourPackageQueryName: true,
          tourPackageQueryType: true,
          customerName: true,
          customerNumber: true,
          numDaysNight: true,
          numAdults: true,
          tourStartsFrom: true,
          tourEndsOn: true,
          totalPrice: true,
          isFeatured: true,
          isArchived: true,
          confirmedVariantId: true,
          updatedAt: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
          associatePartner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.tourPackageQuery.count({ where }),
    ]);

    return NextResponse.json({
      queries,
      total,
      hasMore: offset + queries.length < total,
      nextOffset: offset + queries.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
