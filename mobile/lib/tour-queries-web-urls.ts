/**
 * Build absolute admin web URLs for tour-package query workflows.
 * Used by the mobile detail screen for "open in browser" / share fallbacks.
 */
export function tourQueryDisplayPath(id: string): string {
  return `/tourPackageQueryDisplay/${encodeURIComponent(id)}`;
}

export function tourQueryPdfPath(id: string): string {
  return `/tourPackageQueryPDFGenerator/${encodeURIComponent(id)}`;
}

export function tourQueryPdfWithVariantsPath(id: string): string {
  return `/tourPackageQueryPDFGeneratorWithVariants/${encodeURIComponent(id)}`;
}

export function tourQueryVoucherPath(id: string): string {
  return `/tourPackageQueryVoucherDisplay/${encodeURIComponent(id)}`;
}

export function tourQueryFinancialSummaryPath(id: string): string {
  return `/fetchaccounts/${encodeURIComponent(id)}`;
}

/** Web admin hotel override editor for a tour package query. */
export function tourQueryHotelUpdatePath(id: string): string {
  return `/tourPackageQueryHotelUpdate/${encodeURIComponent(id)}`;
}

export function absoluteAdminUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
