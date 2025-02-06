import puppeteer, { type Browser } from "puppeteer";
import chromium from "@sparticuz/chromium-min";
import sharp from "sharp"; // Import Sharp for image compression

/**
 * Generates a compressed PDF from the provided HTML content.
 * @param htmlContent - The HTML content to render into a PDF.
 * @returns A buffer containing the optimized PDF file.
 * @throws Error if the PDF generation fails.
 */
export async function generatePDF(htmlContent: string): Promise<Buffer> {
  if (!htmlContent) {
    throw new Error("HTML content is required to generate a PDF.");
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

    // Inject optimized images into the HTML content before rendering
    const optimizedHtml = await optimizeImagesInHtml(htmlContent);
    await page.setContent(optimizedHtml, { waitUntil: "networkidle2" });

    await page.evaluateHandle("document.fonts.ready"); // Ensure fonts are fully loaded

    // Generate the compressed PDF
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

    return pdfBuffer;
  } catch (error) {
    alert(`Error in PDF generation: ${error}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Optimizes images in the provided HTML content before rendering in Puppeteer.
 * Converts images to WebP and embeds them as Base64.
 */
async function optimizeImagesInHtml(htmlContent: string): Promise<string> {
  const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const imageUrls = Array.from(htmlContent.matchAll(imageRegex)).map((match) => match[1]);

  const optimizedImages: { [url: string]: string } = {};

  for (const imageUrl of imageUrls) {
    try {
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const optimizedBuffer = await sharp(Buffer.from(buffer))
        .resize({ width: 800 }) // Resize to 800px width
        .webp({ quality: 75 }) // Convert to WebP with 75% quality
        .toBuffer();

      // Convert optimized image to Base64 for embedding
      const base64Image = `data:image/webp;base64,${optimizedBuffer.toString("base64")}`;
      optimizedImages[imageUrl] = base64Image;
    } catch (error) {
      console.error("Error optimizing image:", imageUrl, error);
      optimizedImages[imageUrl] = imageUrl; // Fallback to original image
    }
  }

  // Replace images in HTML content
  let optimizedHtml = htmlContent;
  for (const [originalUrl, optimizedUrl] of Object.entries(optimizedImages)) {
    optimizedHtml = optimizedHtml.replace(new RegExp(originalUrl, "g"), optimizedUrl);
  }

  return optimizedHtml;
}
