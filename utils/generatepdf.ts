import puppeteer, { type Browser } from "puppeteer";
// import puppeteerCore, { type Browser as BrowserCore } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

/**
 * Generates a PDF from the provided HTML content.
 * @param htmlContent - The HTML content to render into a PDF.
 * @returns A buffer containing the PDF file.
 * @throws Error if the PDF generation fails.
 */
export async function generatePDF(htmlContent: string): Promise<Buffer> {
  if (!htmlContent) {
    throw new Error("HTML content is required to generate a PDF.");
  }

  // Initialize the `browser` variable
  let browser: Browser |  null = null;

  try {
    // Check if we are in production or local environment
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

    if (isProduction) {
      const executablePath = await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );

      browser = await puppeteer.launch({
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

    // Set the HTML content for the page
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  
    await page.evaluateHandle('document.fonts.ready');

    // Generate the PDF
    const pdfBuffer = (await page.pdf({
      format: "A4",
      printBackground: true,
      scale: 0.8,
      margin: {
        top: "10px",
        right: "10px",
        bottom: "10px",
        left: "10px",
      },
    })) as Buffer; // Explicitly cast the result to Buffer

    return pdfBuffer;
  } catch (error) {
    console.error("Error in PDF generation:", error);
    throw error;
  } finally {
    // Ensure the browser is closed, even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
}