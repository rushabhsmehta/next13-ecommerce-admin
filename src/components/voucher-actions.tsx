"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "react-hot-toast";

interface VoucherActionsProps {
  id: string;
  type: "receipt" | "payment" | "sale" | "purchase" | "income" | "expense" | "sale-return" | "purchase-return" | "tour-package-query";
}

const escapeHtml = (value?: string | null): string => {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatTextBlock = (value?: string | null): string => {
  if (!value) return "";
  return escapeHtml(value).replace(/\n/g, "<br />");
};

const collectHeadMarkup = (): string => {
  const selectors = [
    "meta[charset]",
    "meta[name=\"viewport\"]",
    "link[rel=\"preconnect\"]",
    "link[rel=\"dns-prefetch\"]",
    "link[rel=\"stylesheet\"]",
    "link[rel=\"preload\"][as=\"style\"]",
    "link[rel=\"preload\"][as=\"font\"]",
    "style",
    "title",
  ];

  const unique = new Set<string>();
  selectors.forEach((selector) => {
    document.head.querySelectorAll(selector).forEach((node) => {
      const html = (node as HTMLElement).outerHTML;
      if (html) {
        unique.add(html);
      }
    });
  });

  return Array.from(unique).join("\n");
};

const makeAssetUrlsAbsolute = (root: HTMLElement) => {
  const toAbsolute = (url: string) => {
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  };

  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) {
      img.setAttribute("src", toAbsolute(src));
    }
    const srcSet = img.getAttribute("srcset");
    if (srcSet) {
      const updated = srcSet
        .split(",")
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) return "";
          const parts = trimmed.split(/\s+/);
          const absolute = toAbsolute(parts[0]);
          return parts[1] ? `${absolute} ${parts[1]}` : absolute;
        })
        .filter(Boolean)
        .join(", ");
      img.setAttribute("srcset", updated);
    }
  });

  root.querySelectorAll<HTMLSourceElement>("source").forEach((source) => {
    const srcSet = source.getAttribute("srcset");
    if (srcSet) {
      const updated = srcSet
        .split(",")
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) return "";
          const parts = trimmed.split(/\s+/);
          const absolute = toAbsolute(parts[0]);
          return parts[1] ? `${absolute} ${parts[1]}` : absolute;
        })
        .filter(Boolean)
        .join(", ");
      source.setAttribute("srcset", updated);
    }
  });
};

const buildVoucherHtml = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement;
  makeAssetUrlsAbsolute(clone);

  const headMarkup = collectHeadMarkup();
  const inlineStyles = `
    <style>
      :root { color-scheme: light; }
      @page { size: A4; }
      html, body { margin: 0; padding: 0; background: #f8fafc; }
      body { font-family: 'Inter', 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  .pdf-wrapper { background: #f8fafc; padding: 120px 40px 200px 40px; box-sizing: border-box; }
  #voucher-content { max-width: 780px; margin: 0 auto; }
      [data-pdf-section] { break-inside: avoid; page-break-inside: avoid; }
      [data-pdf-break-before="true"] { break-before: page; page-break-before: always; }
      .print\\:hidden { display: none !important; }
      img { max-width: 100%; height: auto; break-inside: avoid; }
    </style>
  `;

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <base href="${window.location.origin}/" />
      ${headMarkup}
      ${inlineStyles}
    </head>
    <body>
      <div class="pdf-wrapper">
        ${clone.outerHTML}
      </div>
    </body>
  </html>`;
};

const buildHeaderHtml = (): string => `
  <header style="font-family: 'Inter','Segoe UI',sans-serif; width: 100%; box-sizing: border-box; padding: 12px 24px 8px; background: rgba(255, 247, 237, 0.58); border-bottom: 1px solid #fed7aa;">
    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
      <div style="flex: 1; height: 3px; background: linear-gradient(90deg,#fb923c,#f97316); border-radius: 999px;"></div>
      <div style="font-size: 9px; font-weight: 600; color: #ea580c; letter-spacing: 0.06em;">Page <span class="pageNumber"></span></div>
    </div>
  </header>
`;

const buildFooterHtml = (
  label?: string | null,
  primary?: string | null,
  secondary?: string | null,
  website?: string | null,
  logo?: string | null,
  tagline?: string | null,
): string => {
  const safeLabel = escapeHtml(label);
  const safePrimary = formatTextBlock(primary);
  const safeSecondary = formatTextBlock(secondary);
  const safeTagline = escapeHtml(tagline);
  const safeLogo = escapeHtml(logo);

  const safeWebsiteUrl = escapeHtml(website);
  const websiteLabel = safeWebsiteUrl
    ? safeWebsiteUrl.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")
    : "";

  return `
    <footer style="font-family: 'Inter','Segoe UI',sans-serif; width: 100%; box-sizing: border-box; padding: 14px 26px 12px; background: linear-gradient(135deg,#fefaf6 0%,#fff5eb 100%); border-top: 2px solid #fb923c; color: #7c2d12;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          ${safeLogo ? `<img src="${safeLogo}" alt="${safeLabel || "Company"} logo" style="height: 22px; width: auto; object-fit: contain;" />` : ""}
          <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
            ${safeLabel ? `<span style="font-size: 13px; font-weight: 700; color: #dc2626; line-height: 1.1;">${safeLabel}</span>` : ""}
            ${safeTagline ? `<span style="font-size: 9px; font-weight: 500; color: #9a3412;">${safeTagline}</span>` : ""}
          </div>
        </div>
        <div style="background: #fff; padding: 4px 10px; border-radius: 999px; border: 1px solid #fed7aa; font-size: 9px; font-weight: 600; color: #9a3412;">
          Page <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      </div>
      <div style="margin-top: 10px; background: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(15,23,42,0.08);">
        <div style="display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: center; text-align: center;">
          ${safePrimary ? `<div style="font-size: 9px; font-weight: 600; color: #7c2d12;">${safePrimary}</div>` : ""}
          ${safeSecondary ? `<div style="font-size: 9px; font-weight: 500; color: #9a3412;">${safeSecondary}</div>` : ""}
        </div>
      </div>
      <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        ${websiteLabel ? `<a href="${safeWebsiteUrl}" target="_blank" style="font-size: 9px; font-weight: 600; color: #b45309; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; padding: 4px 8px; border-radius: 6px; border: 1px solid #fed7aa;">Website: ${websiteLabel}</a>` : ""}
        <span style="font-size: 8px; font-style: italic; font-weight: 500; color: #9a3412; margin-left: auto;">Crafting journeys with care and expertise.</span>
      </div>
    </footer>
  `;
};

const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const VoucherActions: React.FC<VoucherActionsProps> = ({ id, type }) => {
  const [loading, setLoading] = useState(false);

  const toAbsoluteUrl = (value?: string | null) => {
    if (!value) return "";
    try {
      return new URL(value, window.location.origin).href;
    } catch {
      return value;
    }
  };

  const generatePDF = async () => {
    const content = document.getElementById("voucher-content");
    if (!content) {
      toast.error("Could not find voucher content to convert");
      return;
    }

    const footerLabel = content.getAttribute("data-pdf-footer-label") || "";
    const footerPrimary = content.getAttribute("data-pdf-footer-primary") || "";
    const footerSecondary = content.getAttribute("data-pdf-footer-secondary") || "";
    const footerWebsite = content.getAttribute("data-pdf-footer-website") || "";
    const footerLogo = content.getAttribute("data-pdf-footer-logo") || "";
    const footerTagline = content.getAttribute("data-pdf-footer-tagline") || "";

  const footerLogoUrl = toAbsoluteUrl(footerLogo);
  const footerWebsiteUrl = toAbsoluteUrl(footerWebsite);

    setLoading(true);
    const loadingToast = toast.loading("Preparing PDF...");

    try {
      const htmlContent = buildVoucherHtml(content);
      const headerHtml = buildHeaderHtml();
  const footerHtml = buildFooterHtml(footerLabel, footerPrimary, footerSecondary, footerWebsiteUrl, footerLogoUrl, footerTagline);

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent,
          headerHtml,
          footerHtml,
          margin: {
            top: "72px",
            right: "32px",
            bottom: "128px",
            left: "32px",
          },
          scale: 0.92,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(errorPayload || "Unable to generate PDF");
      }

      const blob = await response.blob();
      triggerFileDownload(blob, `${type}-voucher-${id.substring(0, 8)}.pdf`);

      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="flex items-center gap-2 print:hidden"
      >
        <Printer className="h-4 w-4" />
        Print
      </Button>
      <Button
        variant="default"
        onClick={generatePDF}
        disabled={loading}
        className="flex items-center gap-2 print:hidden"
      >
        <Download className="h-4 w-4" />
        {loading ? "Generating..." : "Download PDF"}
      </Button>
    </div>
  );
};

