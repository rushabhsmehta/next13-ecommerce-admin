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

  document.querySelectorAll("style[data-pdf-inline-style]").forEach((node) => {
    const html = (node as HTMLElement).outerHTML;
    if (html) {
      unique.add(html);
    }
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
      html, body { margin: 0; padding: 0; background: #ffffff; }
      body { font-family: 'Inter', 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  .pdf-wrapper { background: #ffffff; padding: 0 24px; box-sizing: border-box; }
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
  <header style="font-family: 'Inter','Segoe UI',sans-serif; width: 100%; box-sizing: border-box; padding: 14px 28px 10px; color: #6B7280;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
      <div style="font-size: 8.5px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #9CA3AF;">Booking Voucher</div>
      <div style="font-size: 8.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: #C2410C;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
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
    <footer style="font-family: 'Inter','Segoe UI',sans-serif; width: 100%; box-sizing: border-box; padding: 10px 28px 12px; color: #6B7280;">
      <div style="border-top: 1px solid #E5E7EB; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          ${safeLogo ? `<img src="${safeLogo}" alt="${safeLabel || "Company"} logo" style="height: 18px; width: auto; object-fit: contain; opacity: 0.9;" />` : ""}
          <div style="display: flex; flex-direction: column; gap: 1px; min-width: 0;">
            ${safeLabel ? `<span style="font-size: 9.5px; font-weight: 600; color: #111827; letter-spacing: 0.04em; line-height: 1.2;">${safeLabel}</span>` : ""}
            ${safeTagline ? `<span style="font-size: 8px; font-style: italic; color: #9CA3AF;">${safeTagline}</span>` : ""}
          </div>
        </div>
        <div style="text-align: right; font-size: 8.5px; color: #6B7280; line-height: 1.4;">
          ${safePrimary ? `<div>${safePrimary}</div>` : ""}
          ${safeSecondary ? `<div style="color: #9CA3AF;">${safeSecondary}</div>` : ""}
          ${websiteLabel ? `<div style="color: #C2410C; font-weight: 600; letter-spacing: 0.06em;">${websiteLabel}</div>` : ""}
        </div>
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
            top: "55px",
            right: "20px",
            bottom: "100px",
            left: "20px",
          },
          scale: 0.9,
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

