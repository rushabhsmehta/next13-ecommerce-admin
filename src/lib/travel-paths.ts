/** Hosts that serve the public travel site at clean URLs (no /travel prefix). */
export const DEFAULT_TRAVEL_PUBLIC_HOSTS = [
  "aagamholidays.com",
  "www.aagamholidays.com",
];

export const TRAVEL_PUBLIC_SEGMENTS = [
  "offers",
  "packages",
  "destinations",
  "account-deletion",
  "data-deletion",
  "privacy",
  "terms",
  "login",
  "chat",
  "account",
] as const;

export function parseTravelPublicHosts(): string[] {
  const fromEnv = process.env.TRAVEL_PUBLIC_HOSTS?.trim();
  if (!fromEnv) return DEFAULT_TRAVEL_PUBLIC_HOSTS;
  return fromEnv
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeHost(hostname: string): string {
  return hostname.split(":")[0].toLowerCase();
}

export function isTravelPublicHost(hostname: string): boolean {
  return parseTravelPublicHosts().includes(normalizeHost(hostname));
}

export function isTravelPublicBrowserPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return true;
  if (pathname.startsWith("/travel")) return true;

  const segment = pathname.slice(1).split("/")[0]?.split("?")[0];
  return TRAVEL_PUBLIC_SEGMENTS.includes(
    segment as (typeof TRAVEL_PUBLIC_SEGMENTS)[number]
  );
}

export function getTravelBasePathFromHost(hostname: string): string {
  return isTravelPublicHost(hostname) ? "" : "/travel";
}

export function getTravelBasePathFromPathname(pathname: string): string {
  return pathname.startsWith("/travel") ? "/travel" : "";
}

/** Build a travel site href. `subpath` is e.g. `/packages`, `/login`, or `/` for home. */
export function travelHref(subpath: string, basePath = "/travel"): string {
  const [pathPart, query] = subpath.split("?");
  const normalized =
    !pathPart || pathPart === "/"
      ? "/"
      : pathPart.startsWith("/")
        ? pathPart
        : `/${pathPart}`;

  let result: string;
  if (basePath === "") {
    result = normalized === "/" ? "/" : normalized;
  } else if (normalized === "/") {
    result = basePath;
  } else if (normalized.startsWith("/travel")) {
    result = normalized;
  } else {
    result = `${basePath}${normalized}`;
  }

  return query ? `${result}?${query}` : result;
}

export function travelHomeHref(basePath = "/travel"): string {
  return basePath || "/";
}

/** Strip /travel prefix for canonical URLs on the public travel domain. */
export function toPublicTravelPath(internalPath: string): string {
  if (!internalPath.startsWith("/travel")) return internalPath;
  const rest = internalPath.slice("/travel".length);
  return rest === "" ? "/" : rest;
}

/** Map browser path to internal /travel/* path for middleware rewrite. */
export function toInternalTravelPath(browserPath: string): string {
  if (browserPath.startsWith("/travel")) return browserPath;
  if (browserPath === "/") return "/travel";
  return `/travel${browserPath}`;
}

export function isTravelPublicApiPath(path: string): boolean {
  return (
    path.startsWith("/api/travel") ||
    path.startsWith("/api/travel-auth") ||
    path.startsWith("/api/tourPackageBySlug") ||
    path.startsWith("/api/chat") ||
    path.startsWith("/api/auth")
  );
}

export function adminDashboardUrl(path = "/"): string {
  const adminHost = process.env.ADMIN_PUBLIC_HOST || "admin.aagamholidays.com";
  return `https://${adminHost}${path}`;
}
