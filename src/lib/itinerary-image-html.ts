import { escapeAttr, safeUrl } from "@/lib/html-escape";

const CLOUDINARY_UPLOAD =
  /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/** Cloudinary AVIF and other exotic formats often fail in Puppeteer PDF capture. */
export function resolvePdfImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  let normalized = url.trim();
  if (normalized.startsWith("//")) normalized = `https:${normalized}`;
  if (normalized.startsWith("/")) {
    normalized = `https://admin.aagamholidays.com${normalized}`;
  }

  const cloudinary = normalized.match(CLOUDINARY_UPLOAD);
  if (cloudinary) {
    const [, prefix, rest] = cloudinary;
    const needsFormat =
      /\.avif(\?|$)/i.test(normalized) ||
      !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(normalized.split("?")[0] ?? normalized);
    if (needsFormat && !/^f_[a-z0-9,_-]+\//i.test(rest)) {
      normalized = `${prefix}f_jpg,q_auto/${rest}`;
    }
  }

  return safeUrl(normalized);
}

/**
 * Renders a full-width landscape grid of itinerary images for PDF HTML output.
 *
 * - Images are placed BEFORE the description block (consistent across all generators).
 * - URLs are validated with safeUrl (SSRF guard) and encoded with escapeAttr (XSS guard).
 * - Aspect ratio: 2:1 landscape (padding-bottom: 50%), max 3 columns.
 * - Returns an empty string when there are no valid images.
 */
export function renderItineraryImages(
  images: { url: string }[] | null | undefined,
  dayNumber?: number | null,
): string {
  if (!images || images.length === 0) return "";

  const validUrls = images
    .map((img) => resolvePdfImageUrl(img.url))
    .filter(Boolean)
    .slice(0, 3);

  if (validUrls.length === 0) return "";

  const count = validUrls.length;
  const cols = `repeat(${count}, 1fr)`;

  return `
    <div style="display: grid; grid-template-columns: ${cols}; gap: 0; margin-bottom: 0;">
      ${validUrls
        .map(
          (url, idx) => `
        <div style="position: relative; width: 100%; padding-bottom: 50%; overflow: hidden; background: #f3f4f6;${idx > 0 ? " border-left: 2px solid white;" : ""}">
          <img
            src="${escapeAttr(url)}"
            alt="Day ${dayNumber ?? ""} Image ${idx + 1}"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
          />
        </div>`,
        )
        .join("")}
    </div>`;
}

/** Renders up to 3 activity images in a compact row for PDF HTML output. */
export function renderActivityImages(
  images: { url: string }[] | null | undefined,
  activityTitle?: string | null,
): string {
  if (!images || images.length === 0) return "";

  const validUrls = images
    .map((img) => resolvePdfImageUrl(img.url))
    .filter(Boolean)
    .slice(0, 3);

  if (validUrls.length === 0) return "";

  const count = validUrls.length;
  const alt = escapeAttr(activityTitle || "Activity");

  return `
    <div style="display: grid; grid-template-columns: repeat(${count}, 1fr); gap: 6px; margin: 8px 0; max-height: 120px; overflow: hidden;">
      ${validUrls
        .map(
          (url) => `
        <div style="height: 120px; overflow: hidden; border-radius: 4px; background: #f3f4f6;">
          <img src="${escapeAttr(url)}" alt="${alt}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>`,
        )
        .join("")}
    </div>`;
}
