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

    const base = resolvePdfBaseUrl(req);
    const pagePath = withVariants
      ? `/tourPackageQueryPDFGeneratorWithVariants/${encodeURIComponent(id)}`
      : `/tourPackageQueryPDFGenerator/${encodeURIComponent(id)}`;
    // `print=1` tells the generator page to render the composed proposal HTML
    // inline instead of POSTing to the auth-protected `/api/generate-pdf`.
    // JavaScript must stay enabled so React can hydrate the print-mode HTML
    // (dangerouslySetInnerHTML). Routes are public in `proxy.ts` and the
    // HeadlessChrome UA skips org RBAC for this automation path.
    const pageUrl = `${base}${pagePath}?print=1&search=AH`;

    const pdf = await generatePDFFromUrl(pageUrl, {
      waitMs: 2000,
      waitForSelector: '[data-pdf-ready="1"]',
    });

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
      (existing.tourPackageQueryName?.trim() ||
        existing.tourPackageQueryNumber ||
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
