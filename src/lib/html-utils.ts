/**
 * Strips HTML tags from a string, returning plain text.
 * Used by ItineraryTab, PackageVariantsTab, and other components that handle rich text.
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  if (typeof window !== 'undefined' && window.DOMParser) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || doc.body.innerText || '';
  }
  return html.replace(/<[^>]*>/g, '').trim();
};
