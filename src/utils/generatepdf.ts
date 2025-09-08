import puppeteer, { type Browser } from "puppeteer";
// import puppeteerCore, { type Browser as BrowserCore } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

export type PdfMargin = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};

export interface GeneratePdfOptions {
  headerHtml?: string;
  footerHtml?: string;
  margin?: PdfMargin;
  scale?: number;
}

// Inline external <img src="http(s)://..."> tags as data URIs to ensure they render in header/footer templates
async function inlineImagesInHtml(html: string): Promise<string> {
  if (!html) return html;
  try {
    const imgSrcRegex = /<img\b[^>]*?src=["'](http[^"']+)["'][^>]*>/gi;
    const urls: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = imgSrcRegex.exec(html)) !== null) {
      if (m[1]) urls.push(m[1]);
    }

    if (urls.length === 0) return html;
    const uniqueUrls = Array.from(new Set(urls));
    const urlToDataUri = new Map<string, string>();

    await Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const contentType = res.headers.get("content-type") || "image/png";
          const buffer = Buffer.from(await res.arrayBuffer());
          const base64 = buffer.toString("base64");
          const dataUri = `data:${contentType};base64,${base64}`;
          urlToDataUri.set(url, dataUri);
        } catch {
          // ignore failed fetch; keep original URL
        }
      })
    );

    let out = html;
    urlToDataUri.forEach((dataUri, url) => {
      const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(esc, "g"), dataUri);
    });
    return out;
  } catch {
    return html;
  }
}

/**
 * Generates a PDF from the provided HTML content.
 * @param htmlContent - The HTML content to render into a PDF.
 * @param options - Optional header/footer and PDF tuning options.
 * @returns A buffer containing the PDF file.
 * @throws Error if the PDF generation fails.
 */
export async function generatePDF(htmlContent: string, options?: GeneratePdfOptions): Promise<Buffer> {
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
    const hasHeaderFooter = Boolean(options?.headerHtml || options?.footerHtml);
    const marginDefaults = hasHeaderFooter
      ? { top: "72px", right: "14px", bottom: "72px", left: "14px" }
      : { top: "10px", right: "10px", bottom: "10px", left: "10px" };

    const margin = {
      top: options?.margin?.top ?? marginDefaults.top,
      right: options?.margin?.right ?? marginDefaults.right,
      bottom: options?.margin?.bottom ?? marginDefaults.bottom,
      left: options?.margin?.left ?? marginDefaults.left,
    };

    const headerTemplate = options?.headerHtml
      ? await inlineImagesInHtml(options.headerHtml)
      : "<div></div>";
    const footerTemplate = options?.footerHtml
      ? await inlineImagesInHtml(options.footerHtml)
      : "<div></div>";

    const pdfBuffer = (await page.pdf({
      format: "A4",
      printBackground: true,
      scale: options?.scale ?? 0.8,
      margin,
      displayHeaderFooter: hasHeaderFooter,
      headerTemplate,
      footerTemplate,
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
