import puppeteer, { type Browser } from "puppeteer";
import chromium from "@sparticuz/chromium-min";

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  if (!htmlContent) {
    throw new Error("HTML content is required to generate a PDF.");
  }

  let browser: Browser | null = null;

  try {
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

    if (isProduction) {
      const executablePath = await chromium.executablePath();
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
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    // **Optimize page rendering before generating PDF**
    await page.evaluate(() => {
      document.body.style.zoom = "0.85"; // Reduce page scale slightly
      document.querySelectorAll("img").forEach((img) => {
        img.setAttribute("width", "70%"); // Reduce image sizes dynamically
      });
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // Removes background to reduce size
      margin: { top: "10px", right: "10px", bottom: "10px", left: "10px" },
      scale: 0.9, // Reduce size further
    });

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
