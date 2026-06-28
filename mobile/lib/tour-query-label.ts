export function resolveTourQueryLabel(
  data: {
    tourPackageQueryName?: string | null;
    tourPackageQueryNumber?: string | null;
  },
  fallback = "Tour Query"
): string {
  return data.tourPackageQueryName?.trim() || data.tourPackageQueryNumber || fallback;
}
