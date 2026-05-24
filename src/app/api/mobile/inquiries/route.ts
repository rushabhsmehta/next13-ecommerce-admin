import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";

export const dynamic = "force-dynamic";

/**
 * Mobile inquiry picker for creating tour queries.
 * The web `/api/inquiries` route can be redirected by Clerk middleware on
 * native bearer-only requests, so the mobile create flow needs a bearer-aware
 * list endpoint.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);

    const parts: Prisma.InquiryWhereInput[] = [];
    if (access.isAssociate && access.associatePartnerId) {
      parts.push({ associatePartnerId: access.associatePartnerId });
    }
    if (search) {
      parts.push({
        OR: [
          { customerName: { contains: search } },
          { customerMobileNumber: { contains: search } },
          { status: { contains: search } },
          { location: { label: { contains: search } } },
        ],
      });
    }

    const where: Prisma.InquiryWhereInput =
      parts.length === 0 ? {} : parts.length === 1 ? parts[0]! : { AND: parts };

    const rows = await prismadb.inquiry.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        customerMobileNumber: true,
        locationId: true,
        status: true,
        journeyDate: true,
        nextFollowUpDate: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
        associatePartner: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.log("[MOBILE_INQUIRIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
