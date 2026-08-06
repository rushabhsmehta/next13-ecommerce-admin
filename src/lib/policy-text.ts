/** Shared helpers for policy textarea ↔ string[] paragraph fields. */

export function paragraphsToText(items: string[] | null | undefined): string {
  return (items || []).filter((item) => String(item ?? "").trim()).join("\n\n");
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/**
 * Keep the in-progress textarea string when the only difference from the
 * stored paragraphs is trailing spaces / blank lines the user is still typing.
 * Without this, syncing trimmed paragraphs back into the input collapses
 * "price included" into "priceincluded" as each space is trimmed away.
 */
export function reconcilePolicyDraft(
  currentDraft: string,
  value: string[] | null | undefined
): string {
  const fromValue = paragraphsToText(value);
  if (paragraphsToText(textToParagraphs(currentDraft)) === fromValue) {
    return currentDraft;
  }
  return fromValue;
}
