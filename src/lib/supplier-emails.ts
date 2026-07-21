/**
 * Supplier.email stores one or more addresses as a comma-separated string.
 * Parse / format helpers keep list UIs and Gmail "To" in sync without a schema migration.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isValidEmailAddress(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Split comma / semicolon / newline separated emails; trim + de-dupe (case-insensitive). */
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

/** Persist as comma-separated string, or null when empty. */
export function formatSupplierEmails(
  emails: string[] | string | null | undefined
): string | null {
  const list = Array.isArray(emails)
    ? parseSupplierEmails(emails.join(","))
    : parseSupplierEmails(emails ?? "");
  return list.length > 0 ? list.join(", ") : null;
}

/** Validate a list; returns cleaned emails or throws Error with a user-facing message. */
export function requireValidSupplierEmails(
  value: string | string[] | null | undefined
): string[] {
  const list = Array.isArray(value)
    ? parseSupplierEmails(value.join(","))
    : parseSupplierEmails(value ?? "");
  if (list.length === 0) {
    throw new Error("At least one email address is required");
  }
  const invalid = list.filter((email) => !isValidEmailAddress(email));
  if (invalid.length > 0) {
    throw new Error(`Invalid email: ${invalid.join(", ")}`);
  }
  return list;
}
