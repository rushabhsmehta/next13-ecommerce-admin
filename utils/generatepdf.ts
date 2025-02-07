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

    // Navigate to the provided URL
    await page.goto(url, { waitUntil: "networkidle2" }); // Waits until most network requests are done

    // ✅ Wait for 10 seconds to ensure all elements are fully loaded
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 10000)));

    // Ensure fonts are fully loaded before PDF generation
    await page.evaluateHandle("document.fonts.ready");

    // ✅ Ensure all images are fully loaded before generating the PDF
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
            } else {
              img.onload = img.onerror = () => resolve();
            }
          })
        )
      );
    });

    // ✅ Scroll the page multiple times to force load all content
    await autoScroll(page);

    // Generate the PDF
    const pdfBuffer = (await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10px",
        right: "0px",
        bottom: "10px",
        left: "0px",
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

/**
 * Scrolls the page multiple times to ensure all images and elements are loaded.
 * @param page - Puppeteer Page instance
 */
async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 200; // Scroll step
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200); // Slower scroll speed for better rendering
    });
  });
}
