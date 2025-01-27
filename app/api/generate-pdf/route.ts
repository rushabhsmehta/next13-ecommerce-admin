import puppeteer from "puppeteer";

export async function POST(req: Request): Promise<Response> {
  try {
    // Parse the JSON request body
    const { htmlContent }: { htmlContent: string } = await req.json();

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "htmlContent is required" }),
        { status: 400 }
      );
    }

    // Launch Puppeteer in headless mode
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Return the PDF as a response
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=generated.pdf",
      },
    });
  } catch (error) {
    // Narrow the type of 'error'
    if (error instanceof Error) {
      console.error("Error generating PDF:", error.message);
      return new Response(
        JSON.stringify({ error: "PDF generation failed", details: error.message }),
        { status: 500 }
      );
    }

    // Handle non-Error types (fallback)
    console.error("Unknown error occurred during PDF generation:", error);
    return new Response(
      JSON.stringify({ error: "An unknown error occurred" }),
      { status: 500 }
    );
  }
}
