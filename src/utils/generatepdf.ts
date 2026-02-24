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

export interface CompanyInfo {
  name: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
}

/**
 * Creates a professional footer template for PDFs
 * @param companyInfo - Company information to include in footer
 * @returns HTML string for footer template
 */
export function createProfessionalFooter(companyInfo?: CompanyInfo): string {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px; 
      padding: 15px 20px; 
      border-top: 3px solid #2563eb; 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      color: #475569;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      min-height: 50px;
    ">
      <div style="display: flex; flex-direction: column; gap: 2px;">
        ${companyInfo ? `
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${companyInfo.name}</div>
          <div style="font-size: 9px;">
            ${companyInfo.phone ? `📞 ${companyInfo.phone}` : ''}
            ${companyInfo.phone && companyInfo.email ? ' • ' : ''}
            ${companyInfo.email ? `📧 ${companyInfo.email}` : ''}
          </div>
        ` : `<div style="font-weight: 500;">Generated on: ${currentDate}</div>`}
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 600; color: #1e293b;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        <div style="font-size: 9px; margin-top: 2px;">${currentDate}</div>
      </div>
    </div>
  `;
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

    // Inline remote images in the body HTML as data URIs to prevent networkidle0 delays/timeouts
    const inlinedHtmlContent = await inlineImagesInHtml(htmlContent);

    // Set the HTML content for the page
    await page.setContent(inlinedHtmlContent, { waitUntil: "networkidle0" });
  
    await page.evaluateHandle('document.fonts.ready');

    // Generate the PDF
    const hasHeaderFooter = Boolean(options?.headerHtml || options?.footerHtml);
    // Use a larger default bottom margin when header/footer are displayed to prevent overlap
    const marginDefaults = hasHeaderFooter
      ? { top: "72px", right: "14px", bottom: "96px", left: "14px" }
      : { top: "10px", right: "10px", bottom: "10px", left: "10px" };

    // Helper to parse a pixel string like "64px" to a number (64)
    const pxToNumber = (v?: string) => {
      if (!v) return undefined;
      const n = parseFloat(String(v).replace(/px$/i, ""));
      return isNaN(n) ? undefined : n;
    };

    // Compose margins and enforce a safe minimum when footer/header is used
    const composed = {
      top: options?.margin?.top ?? marginDefaults.top,
      right: options?.margin?.right ?? marginDefaults.right,
      bottom: options?.margin?.bottom ?? marginDefaults.bottom,
      left: options?.margin?.left ?? marginDefaults.left,
    };

    // Clamp bottom margin to avoid footer overlap when a footer is present
    if (options?.footerHtml) {
      const minBottomPx = 200; // generous space to prevent footer overlap with tall sections
      const currentBottomPx = pxToNumber(composed.bottom) ?? minBottomPx;
      if (currentBottomPx < minBottomPx) {
        composed.bottom = `${minBottomPx}px`;
      }
    }

    // Slightly protect top margin if a header is present
    if (options?.headerHtml) {
      const minTopPx = 120;
      const currentTopPx = pxToNumber(composed.top) ?? minTopPx;
      if (currentTopPx < minTopPx) {
        composed.top = `${minTopPx}px`;
      }
    }

    const margin = composed;

    const headerTemplate = options?.headerHtml
      ? await inlineImagesInHtml(options.headerHtml)
      : "<div></div>";
    const footerTemplate = options?.footerHtml
      ? await inlineImagesInHtml(options.footerHtml)
      : `<div style="
          font-size: 10px; 
          padding: 15px; 
          border-top: 2px solid #e5e7eb; 
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        ">
          <span style="font-weight: 500;">Generated on: ${new Date().toLocaleDateString()}</span>
          <span style="font-weight: 500;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`;

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
