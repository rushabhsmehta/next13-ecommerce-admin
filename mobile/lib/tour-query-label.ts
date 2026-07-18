export function resolveTourQueryLabel(
  data: {
    tourPackageQueryName?: string | null;
    tourPackageQueryNumber?: string | null;
  },
  fallback = "Tour Query"
): string {
  return data.tourPackageQueryName?.trim() || data.tourPackageQueryNumber || fallback;
}

/**
 * Standard tour-query display name: `client_name - tour_package`.
 * Matches web inquiry→query create (`tourpackagequeryfrominquiry`).
 */
export function buildTourQueryName(
  clientName?: string | null,
  tourPackageName?: string | null
): string {
  const parts: string[] = [];
  const client = clientName?.trim();
  const pkg = tourPackageName?.trim();
  if (client) parts.push(client);
  if (pkg) parts.push(pkg);
  return parts.join(" - ");
}

/**
 * Prefer an already-composed query name; otherwise join client + package/name.
 */
export function resolveTourQueryNameForSave(
  clientName?: string | null,
  queryOrPackageName?: string | null
): string {
  const client = clientName?.trim() ?? "";
  const name = queryOrPackageName?.trim() ?? "";
  if (!client) return name;
  if (!name) return client;
  if (name.toLowerCase().startsWith(client.toLowerCase())) return name;
  return buildTourQueryName(client, name);
}
