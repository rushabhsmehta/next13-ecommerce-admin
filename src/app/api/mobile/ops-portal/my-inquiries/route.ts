import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  formatOpsInquiry,
  opsInquiryInclude,
  requireMobileOpsPortalStaff,
} from "@/app/api/mobile/lib/ops-portal-staff";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const staffResult = await requireMobileOpsPortalStaff(userId);
    if (!staffResult.ok) return staffResult.response;
    const { staff } = staffResult;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 30, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const where: any = { assignedToStaffId: staff.id };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { customerMobileNumber: { contains: search } },
        { status: { contains: search } },
        { location: { label: { contains: search } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prismadb.inquiry.findMany({
        where,
        include: opsInquiryInclude,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.inquiry.count({ where }),
    ]);

    return NextResponse.json({
      staff,
      items: rows.map(formatOpsInquiry),
      total,
      hasMore: offset + rows.length < total,
      nextOffset: offset + rows.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_PORTAL_MY_INQUIRIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
