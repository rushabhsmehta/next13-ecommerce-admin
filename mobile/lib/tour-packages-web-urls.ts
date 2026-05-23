/** Admin web paths for tour package PDF / display workflows. */
export function tourPackagePdfPath(id: string): string {
  return `/tourPackagePDFGenerator/${encodeURIComponent(id)}`;
}

export function tourPackagePdfWithVariantsPath(id: string): string {
  return `/tourPackagePDFGeneratorWithVariants/${encodeURIComponent(id)}`;
}

export function absoluteAdminUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
