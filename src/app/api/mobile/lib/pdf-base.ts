/**
 * Resolve the base origin that Puppeteer should render the PDF generator page
 * from.
 *
 * In production we always use the configured public URL (`NEXT_PUBLIC_APP_URL`)
 * so PDFs are rendered from the canonical domain. In dev / preview we render
 * against the *same* server that handled this request, so locally-visible data
 * and template changes are reflected instead of silently hitting production.
 */
export function resolvePdfBaseUrl(req: Request): string {
  const envBase = (
    process.env.NEXT_PUBLIC_APP_URL || "https://admin.aagamholidays.com"
  ).replace(/\/$/, "");

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (isProduction) return envBase;

  try {
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const host = forwardedHost || url.host;
    const proto = forwardedProto || url.protocol.replace(/:$/, "");
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    // fall through to env base
  }

  return envBase;
}
