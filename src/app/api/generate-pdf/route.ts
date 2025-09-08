import { generatePDF } from "@/utils/generatepdf";

export async function POST(req: Request): Promise<Response> {
  try {
  const { htmlContent, headerHtml, footerHtml, margin, scale }: { htmlContent: string; headerHtml?: string; footerHtml?: string; margin?: any; scale?: number } = await req.json();

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "htmlContent is required" }),
        { status: 400 }
      );
    }

  const pdfBuffer = await generatePDF(htmlContent, { headerHtml, footerHtml, margin, scale });

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
