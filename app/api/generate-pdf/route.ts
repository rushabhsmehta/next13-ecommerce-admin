import puppeteer, { type Browser } from "puppeteer";
import puppeteerCore, { type Browser as BrowserCore } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

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

    // Determine the environment and launch Puppeteer accordingly
    let browser: Browser | BrowserCore;
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      const executablePath = await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );
      browser = await puppeteerCore.launch({
        executablePath,
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10px",
        right: "10px",
        bottom: "10px",
        left: "10px",
      },
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
