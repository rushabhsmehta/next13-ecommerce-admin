/** Escape special characters for safe use inside HTML attribute values. */
export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Return true if the hostname resolves to a private or loopback address (SSRF guard). */
function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  // Loopback / localhost
  if (h === "localhost" || h === "0.0.0.0" || h === "::1") return true;
  // IPv4 private & link-local ranges
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true;                          // 127.x.x.x loopback
    if (a === 10) return true;                           // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16 link-local
  }
  return false;
}

/**
 * Return the URL only if it uses an http/https scheme and does not point to a
 * private/loopback host (SSRF defence); otherwise return an empty string.
 */
export function safeUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (isPrivateHostname(parsed.hostname)) return "";
    // Strip any embedded credentials and return the normalized URL
    parsed.username = "";
    parsed.password = "";
    return parsed.href;
  } catch {
    return "";
  }
}
