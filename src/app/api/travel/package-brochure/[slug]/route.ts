import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { rateLimit } from "@/lib/rate-limit";
import { generatePDF } from "@/utils/generatepdf";
import { buildTourPackageBrochureHtml } from "@/lib/pdf/tour-package-brochure-html";
import { companyInfo } from "@/lib/pdf/branding";
import { sanitizeText } from "@/lib/pdf/text-utils";

export const dynamic = "force-dynamic";

const limiter = rateLimit("expensive");

function publicPackagePageUrl(slugOrId: string): string {
  const base = sanitizeText(companyInfo.AH.website, "https://aagamholidays.com").replace(
    /\/$/,
    ""
  );
  return `${base}/travel/packages/${encodeURIComponent(slugOrId)}`;
}

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

    const include = {
      location: true,
      images: { select: { url: true }, take: 2 },
      itineraries: {
        orderBy: [
          { dayNumber: "asc" as const },
          { days: "asc" as const },
        ],
      },
    };

    let tourPackage = await prismadb.tourPackage.findFirst({
      where: { slug: rawSlug, isArchived: false },
      include,
    });

    if (!tourPackage) {
      tourPackage = await prismadb.tourPackage.findFirst({
        where: { id: rawSlug, isArchived: false },
        include,
      });
    }

    if (!tourPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const urlSegment = tourPackage.slug?.trim() || tourPackage.id;
    const publicUrl = publicPackagePageUrl(urlSegment);

    const jsonToBrochureString = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === "string") return v;
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    };

    const html = buildTourPackageBrochureHtml(
      {
        tourPackageName: tourPackage.tourPackageName,
        numDaysNight: tourPackage.numDaysNight,
        price: tourPackage.price,
        pricePerAdult: tourPackage.pricePerAdult,
        tourCategory: tourPackage.tourCategory,
        inclusions: jsonToBrochureString(tourPackage.inclusions),
        exclusions: jsonToBrochureString(tourPackage.exclusions),
        slug: tourPackage.slug,
        location: tourPackage.location,
        images: tourPackage.images,
        itineraries: tourPackage.itineraries,
      },
      publicUrl
    );

    const pdfBuffer = await generatePDF(html, {
      margin: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
      scale: 0.92,
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
