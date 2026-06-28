import { NextResponse } from "next/server";
import { generatePDFFromUrl } from "@/utils/generatepdf";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import prismadb from "@/lib/prismadb";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { resolvePdfBaseUrl } from "@/app/api/mobile/lib/pdf-base";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-renders a tour-query booking voucher PDF for mobile.
 * Reuses `/tourPackageQueryVoucherDisplay/[id]` via Puppeteer (same pattern
 * as `/api/mobile/tour-queries/[id]/pdf`).
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const existing = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        tourPackageQueryName: true,
        tourPackageQueryNumber: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
      },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, existing)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const base = resolvePdfBaseUrl(req);
    const pageUrl = `${base}/tourPackageQueryVoucherDisplay/${encodeURIComponent(
      id
    )}?search=AH`;

    const pdf = await generatePDFFromUrl(pageUrl, {
      waitMs: 2000,
      waitForSelector: '[data-pdf-ready="1"]',
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQueryVoucher",
      entityId: id,
      action: "READ",
      metadata: {
        number: existing.tourPackageQueryNumber,
        bytes: pdf.length,
      },
    });

    const safeName =
      (existing.tourPackageQueryName?.trim() ||
        existing.tourPackageQueryNumber ||
        id)
        .toString()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60) || "tour-voucher";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-voucher.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VOUCHER]", error);
    return new NextResponse("Voucher generation failed", { status: 500 });
  }
}
