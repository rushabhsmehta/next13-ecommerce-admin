/** Parse tour package policy JSON fields for mobile responses. */
export function parsePolicyField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string" && v.trim().length > 0) as string[];
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) =>
          typeof v === "string"
            ? v
            : typeof v === "object" && v && "text" in v
              ? String((v as { text: unknown }).text)
              : ""
        )
        .filter((v) => v.trim().length > 0);
    }
  } catch {
    /* not JSON */
  }
  return [trimmed];
}

export function stringifyPolicyField(values: string[] | undefined): string | undefined {
  if (values === undefined) return undefined;
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  return JSON.stringify(cleaned);
}

export const POLICY_FIELD_KEYS = [
  "inclusions",
  "exclusions",
  "importantNotes",
  "paymentPolicy",
  "usefulTip",
  "cancellationPolicy",
  "airlineCancellationPolicy",
  "termsconditions",
  "kitchenGroupPolicy",
] as const;

export type PolicyFieldKey = (typeof POLICY_FIELD_KEYS)[number];

export function parsePricingSection(value: unknown): { name: string; price?: string; description?: string }[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const name = "name" in row ? String((row as { name: unknown }).name ?? "") : "";
        if (!name.trim()) return null;
        return {
          name: name.trim(),
          price:
            "price" in row && (row as { price: unknown }).price != null
              ? String((row as { price: unknown }).price)
              : "",
          description:
            "description" in row && (row as { description: unknown }).description != null
              ? String((row as { description: unknown }).description)
              : "",
        };
      })
      .filter(Boolean) as { name: string; price?: string; description?: string }[];
  }
  return [];
}
