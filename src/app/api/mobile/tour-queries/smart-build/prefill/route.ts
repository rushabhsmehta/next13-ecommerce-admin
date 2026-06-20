import { NextResponse } from "next/server";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { loadSmartBuildPrefill } from "@/lib/smart-query-build";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const inquiryId = new URL(req.url).searchParams.get("inquiryId")?.trim();
    if (!inquiryId) {
      return NextResponse.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: inquiryId },
      select: { associatePartnerId: true },
    });
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }
    if (
      access.isAssociate &&
      access.associatePartnerId &&
      inquiry.associatePartnerId !== access.associatePartnerId
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const prefill = await loadSmartBuildPrefill(inquiryId);
    return NextResponse.json(prefill);
  } catch (error) {
    console.log("[MOBILE_SMART_BUILD_PREFILL_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
