/**
 * Lightweight HTML for public brochure PDFs (mobile / travel share).
 * Not the full dashboard proposal layout.
 */

import { companyInfo } from "./branding";
import { parsePolicyField, sanitizeText } from "./text-utils";
import { stripHtml } from "@/lib/html-utils";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BrochureItinerary = {
  dayNumber?: number | null;
  days?: string | null;
  itineraryTitle?: string | null;
  itineraryDescription?: string | null;
};

export type BrochurePackageInput = {
  tourPackageName?: string | null;
  numDaysNight?: string | null;
  price?: string | null;
  pricePerAdult?: string | null;
  tourCategory?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  slug?: string | null;
  location?: { label?: string | null } | null;
  images?: { url?: string | null }[];
  itineraries?: BrochureItinerary[];
};

export function buildTourPackageBrochureHtml(
  pkg: BrochurePackageInput,
  publicPageUrl: string
): string {
  const profile = companyInfo.AH;
  const title = sanitizeText(pkg.tourPackageName, "Tour package");
  const locationLabel = sanitizeText(pkg.location?.label, "");
  const duration = sanitizeText(pkg.numDaysNight, "");
  const category = sanitizeText(pkg.tourCategory, "");
  const priceRaw = pkg.pricePerAdult ?? pkg.price;
  const priceNum =
    priceRaw != null && String(priceRaw).trim() !== ""
      ? Number(priceRaw)
      : NaN;
  const priceLine = Number.isFinite(priceNum)
    ? `From ₹${priceNum.toLocaleString("en-IN")} per person`
    : "";

  const heroUrl = pkg.images?.find((i) => i?.url)?.url ?? "";
  const inclusionLines = parsePolicyField(pkg.inclusions).slice(0, 12);
  const exclusionLines = parsePolicyField(pkg.exclusions).slice(0, 6);

  const itineraryBlocks =
    pkg.itineraries?.map((it, idx) => {
      const dayLabel =
        it.dayNumber != null
          ? `Day ${it.dayNumber}`
          : it.days
            ? sanitizeText(it.days, "")
            : `Day ${idx + 1}`;
      const heading = sanitizeText(it.itineraryTitle, dayLabel);
      const descRaw = it.itineraryDescription
        ? stripHtml(String(it.itineraryDescription))
        : "";
      const desc = descRaw ? escapeHtml(descRaw.slice(0, 280)) : "";
      return `<div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #eee;">
        <div style="font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;">${escapeHtml(dayLabel)}</div>
        <div style="font-size:13px;font-weight:700;color:#111827;margin-top:4px;">${escapeHtml(heading)}</div>
        ${desc ? `<div style="font-size:11px;color:#4b5563;line-height:1.45;margin-top:4px;">${desc}${descRaw.length >= 280 ? "…" : ""}</div>` : ""}
      </div>`;
    }) ?? [];

  const heroImg =
    heroUrl && /^https?:\/\//i.test(heroUrl)
      ? `<img src="${heroUrl.replace(/"/g, "")}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin-bottom:14px;" />`
      : "";

  const inclHtml =
    inclusionLines.length > 0
      ? `<div style="margin:8px 0 0;padding:0;font-size:11px;line-height:1.5;color:#374151;">
          ${inclusionLines.map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`).join("")}
        </div>`
      : `<p style="font-size:11px;color:#9ca3af;margin-top:6px;">See package page for full inclusions.</p>`;

  const exclHtml =
    exclusionLines.length > 0
      ? `<div style="margin-top:14px;"><div style="font-size:12px;font-weight:700;color:#b45309;">Exclusions</div>
        <div style="margin:6px 0 0;padding:0;font-size:11px;line-height:1.45;color:#6b7280;">
          ${exclusionLines.map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`).join("")}
        </div></div>`
      : "";

  const safeUrl = escapeHtml(publicPageUrl);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111827; margin: 0; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px; line-height: 1.25; }
    .meta { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
    .price { font-size: 15px; font-weight: 800; color: #dc2626; margin-top: 10px; }
    .section-title { font-size: 13px; font-weight: 700; color: #ea580c; margin-top: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 4px; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  ${heroImg}
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${locationLabel ? `${escapeHtml(locationLabel)}${duration ? " · " : ""}` : ""}${duration ? escapeHtml(duration) : ""}${category ? `${locationLabel || duration ? " · " : ""}${escapeHtml(category)}` : ""}</div>
  ${priceLine ? `<div class="price">${escapeHtml(priceLine)}</div>` : ""}

  <div class="section-title">Highlights</div>
  ${itineraryBlocks.length > 0 ? itineraryBlocks.join("") : `<p style="font-size:11px;color:#9ca3af;">See full itinerary on our website.</p>`}

  <div class="section-title">Inclusions</div>
  ${inclHtml}
  ${exclHtml}

  <div class="footer">
    <strong>${escapeHtml(profile.name)}</strong><br />
    ${escapeHtml(profile.phone)} · ${escapeHtml(profile.email)}<br />
    ${escapeHtml(profile.website)}<br /><br />
    View full details online:<br />
    <a href="${safeUrl}" style="color:#ea580c;font-weight:600;">${safeUrl}</a>
  </div>
</body>
</html>`;
}
