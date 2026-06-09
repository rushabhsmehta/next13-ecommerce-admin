import { stripHtml } from "@/lib/html-utils";

/** Strip HTML and normalize package titles for public cards and meta tags. */
export function plainPackageTitle(raw: string | null | undefined): string {
  if (!raw) return "Tour Package";
  return stripHtml(raw).replace(/\s+/g, " ").trim() || "Tour Package";
}

/**
 * Short, readable card title from CRM-style names like
 * "BALI | 6N7D | ICONIC SIGHTSEEING – LEMPYUNG, UBUD".
 */
export function formatPackageDisplayName(raw: string | null | undefined): string {
  const text = plainPackageTitle(raw);
  const parts = text
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  let headline = text;
  if (parts.length >= 3) {
    headline = parts.slice(2).join(" · ");
  } else if (parts.length === 2) {
    headline = parts[1];
  }

  if (headline.length > 72) {
    return `${headline.slice(0, 69).trim()}…`;
  }
  return headline;
}
