import { NextResponse } from "next/server";
import { generatePDFFromUrl } from "@/utils/generatepdf";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireOperationsRead } from "@/app/api/mobile/lib/assert-operations-access";
import prismadb from "@/lib/prismadb";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-renders a tour-package PDF for mobile and streams the bytes back.
 * Reuses the web PDF generator pages via Puppeteer (same pattern as tour-query PDFs).
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

    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const existing = await prismadb.tourPackage.findUnique({
      where: { id },
      select: {
        id: true,
        tourPackageName: true,
        slug: true,
      },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const withVariants = searchParams.get("variant") === "1";

    const base = (
      process.env.NEXT_PUBLIC_APP_URL || "https://admin.aagamholidays.com"
    ).replace(/\/$/, "");
    const pagePath = withVariants
      ? `/tourPackagePDFGeneratorWithVariants/${encodeURIComponent(id)}`
      : `/tourPackagePDFGenerator/${encodeURIComponent(id)}`;
    const pageUrl = `${base}${pagePath}`;

    const pdf = await generatePDFFromUrl(pageUrl, { waitMs: 1500 });

    await recordMobileAudit({
      userId,
      entityType: "TourPackagePdf",
      entityId: id,
      action: "READ",
      metadata: {
        withVariants,
        name: existing.tourPackageName,
        bytes: pdf.length,
      },
    });

    const safeName =
      (existing.tourPackageName || existing.slug || id)
        .toString()
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .slice(0, 60) || "tour-package";

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
    console.log("[MOBILE_TOUR_PACKAGE_PDF]", error);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
