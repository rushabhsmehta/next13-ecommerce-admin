import puppeteer, { type Browser } from "puppeteer";
import chromium from "@sparticuz/chromium-min";

/**
 * Generates a PDF from the provided URL.
 * @param url - The URL to capture as a PDF.
 * @returns A buffer containing the PDF file.
 * @throws Error if the PDF generation fails.
 */
export async function generatePDF(url: string): Promise<Buffer> {
  if (!url) {
    throw new Error("A valid URL is required to generate a PDF.");
  }

  let browser: Browser | null = null;

  try {
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

    // Navigate to the provided URL
    await page.goto(url, { waitUntil: "networkidle2" }); // Waits until no more than 2 requests are pending

    // Ensure fonts are fully loaded before PDF generation
    await page.evaluateHandle("document.fonts.ready");

    // Generate the PDF
    const pdfBuffer = (await page.pdf({
      format: "A4",
      printBackground: true,
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
    if (browser) {
      await browser.close();
    }
  }
}
