/**
 * Normalize media URLs for React Native `Image`.
 * - Cloudinary AVIF (and other exotic formats) → JPEG via `f_jpg` transform
 * - Relative `/uploads/...` paths → absolute admin URL
 */
const CLOUDINARY_UPLOAD =
  /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

const DEFAULT_MEDIA_ORIGIN = "https://admin.aagamholidays.com";

const MOBILE_SAFE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;

export function resolveImageUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;

  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${DEFAULT_MEDIA_ORIGIN}${url}`;

  const cloudinary = url.match(CLOUDINARY_UPLOAD);
  if (cloudinary) {
    const [, prefix, rest] = cloudinary;
    if (/^f_[a-z0-9,_-]+\//i.test(rest)) return url;

    const needsFormat =
      /\.avif(\?|$)/i.test(url) || !MOBILE_SAFE_EXT.test(url.split("?")[0] ?? url);
    if (needsFormat) return `${prefix}f_jpg,q_auto/${rest}`;

    if (!/^[^/]*q_auto/i.test(rest)) return `${prefix}q_auto/${rest}`;
  }

  return url;
}
