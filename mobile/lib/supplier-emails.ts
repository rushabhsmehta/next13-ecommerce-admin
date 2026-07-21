/**
 * Supplier.email stores one or more addresses as a comma-separated string.
 * Keep in sync with src/lib/supplier-emails.ts.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function parseSupplierEmails(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,;\n\r]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function formatSupplierEmails(
  emails: string[] | string | null | undefined
): string | null {
  const list = Array.isArray(emails)
    ? parseSupplierEmails(emails.join(","))
    : parseSupplierEmails(emails ?? "");
  return list.length > 0 ? list.join(", ") : null;
}

export function emailsForFormDisplay(value: string | null | undefined): string {
  return parseSupplierEmails(value).join("\n");
}
