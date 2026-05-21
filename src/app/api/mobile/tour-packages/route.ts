import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSalesTripsRead } from "@/app/api/mobile/lib/assert-sales-trips-access";

export const dynamic = "force-dynamic";

/**
 * Lightweight tour-package picker list for the mobile "create query from
 * package" flow. Read-only, requires salesTrips.read.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const includeArchived = searchParams.get("includeArchived") === "1";
    const featuredOnly = searchParams.get("featuredOnly") === "1";

    const where: Prisma.TourPackageWhereInput = includeArchived
      ? {}
      : { isArchived: false };
    if (featuredOnly) where.isFeatured = true;
    if (search) {
      where.OR = [{ tourPackageName: { contains: search } }];
    }

    const [packages, total] = await Promise.all([
      prismadb.tourPackage.findMany({
        where,
        select: {
          id: true,
          tourPackageName: true,
          tourPackageType: true,
          numDaysNight: true,
          price: true,
          isFeatured: true,
          isArchived: true,
          updatedAt: true,
          location: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.tourPackage.count({ where }),
    ]);

    return NextResponse.json({
      packages,
      total,
      hasMore: offset + packages.length < total,
      nextOffset: offset + packages.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
