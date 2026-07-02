import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { rateLimit } from "@/lib/rate-limit";
import { generatePDFFromUrl } from "@/utils/generatepdf";
import { resolvePdfBaseUrl } from "@/app/api/mobile/lib/pdf-base";
import { sanitizeText } from "@/lib/pdf/text-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const limiter = rateLimit("expensive");

function attachmentFilename(pkgName: string): string {
  const safe = sanitizeText(pkgName, "tour-package")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 80);
  return `${safe || "brochure"}.pdf`;
}

export async function GET(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const limited = limiter.check(req);
    if (limited) return limited;

    const params = await props.params;
    const rawSlug = params.slug?.trim();
    if (!rawSlug) {
      return NextResponse.json({ error: "Package slug or id is required" }, { status: 400 });
    }

    let tourPackage = await prismadb.tourPackage.findFirst({
      where: { slug: rawSlug, isArchived: false },
      select: {
        id: true,
        tourPackageName: true,
        slug: true,
      },
    });

    if (!tourPackage) {
      tourPackage = await prismadb.tourPackage.findFirst({
        where: { id: rawSlug, isArchived: false },
        select: {
          id: true,
          tourPackageName: true,
          slug: true,
        },
      });
    }

    if (!tourPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const base = resolvePdfBaseUrl(req);
    const pageUrl = `${base}/tourPackagePDFGenerator/${encodeURIComponent(
      tourPackage.id
    )}?print=1&search=AH`;

    const pdfBuffer = await generatePDFFromUrl(pageUrl, {
      waitMs: 2000,
      waitForSelector: '[data-pdf-ready="1"]',
    });

    const filename = attachmentFilename(tourPackage.tourPackageName ?? "brochure");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[TRAVEL_PACKAGE_BROCHURE_GET]", error);
    return NextResponse.json(
      { error: "PDF generation failed. Please try again later." },
      { status: 500 }
    );
  }
}
