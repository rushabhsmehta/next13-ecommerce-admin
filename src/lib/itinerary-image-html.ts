import { escapeAttr, safeUrl } from "@/lib/html-escape";

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
    .map((img) => safeUrl(img.url))
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
