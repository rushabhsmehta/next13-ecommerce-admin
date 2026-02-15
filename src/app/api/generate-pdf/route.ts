import { generatePDF } from "@/utils/generatepdf";
import { pdfCache } from "@/lib/pdf-cache";
import { auth } from "@clerk/nextjs";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit('expensive');

export async function POST(req: Request): Promise<Response> {
  try {
    const limited = limiter.check(req);
    if (limited) return limited;

    const { userId } = auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthenticated" }),
        { status: 403 }
      );
    }

  const { htmlContent, headerHtml, footerHtml, margin, scale }: { htmlContent: string; headerHtml?: string; footerHtml?: string; margin?: any; scale?: number } = await req.json();

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "htmlContent is required" }),
        { status: 400 }
      );
    }

    // 🔍 Check cache first
    const contentHash = pdfCache.generateHash(htmlContent);
    let pdfBuffer = pdfCache.get(contentHash);
    
    // If not in cache, generate and store
    if (!pdfBuffer) {
      pdfBuffer = await generatePDF(htmlContent, { headerHtml, footerHtml, margin, scale });
      pdfCache.set(htmlContent, pdfBuffer);
    }

  return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=generated.pdf",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred";

    return new Response(
      JSON.stringify({
        error: "PDF generation failed",
        details: errorMessage,
      }),
      { status: 500 }
    );
  }
}
