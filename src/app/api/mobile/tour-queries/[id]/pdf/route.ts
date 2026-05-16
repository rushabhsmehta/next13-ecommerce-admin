import { NextResponse } from "next/server";
import { generatePDFFromUrl } from "@/utils/generatepdf";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import prismadb from "@/lib/prismadb";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-renders a tour-query PDF for mobile and streams the bytes back.
 *
 * Why server-render instead of letting mobile open a web link: per the
 * parity decision, PDFs are produced server-side and the device downloads +
 * shares them. We reuse the existing public PDF/display pages
 * (`/tourPackageQueryPDFGenerator/[id]`, `/tourPackageQueryDisplay/[id]`) via
 * `generatePDFFromUrl`, so there is no duplicate HTML composition.
 *
 * `?variant=1` renders the with-variants generator page.
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

    const { searchParams } = new URL(req.url);
    const withVariants = searchParams.get("variant") === "1";

    const base = (
      process.env.NEXT_PUBLIC_APP_URL || "https://admin.aagamholidays.com"
    ).replace(/\/$/, "");
    const pagePath = withVariants
      ? `/tourPackageQueryPDFGeneratorWithVariants/${encodeURIComponent(id)}`
      : `/tourPackageQueryPDFGenerator/${encodeURIComponent(id)}`;
    const pageUrl = `${base}${pagePath}`;

    const pdf = await generatePDFFromUrl(pageUrl, { waitMs: 1500 });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQueryPdf",
      entityId: id,
      action: "READ",
      metadata: {
        withVariants,
        number: existing.tourPackageQueryNumber,
        bytes: pdf.length,
      },
    });

    const safeName =
      (existing.tourPackageQueryNumber ||
        existing.tourPackageQueryName ||
        id)
        .toString()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60) || "tour-query";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}${
          withVariants ? "-variants" : ""
        }.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_PDF]", error);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
