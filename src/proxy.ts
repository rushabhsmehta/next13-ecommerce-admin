import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  adminDashboardUrl,
  isTravelPublicApiPath,
  isTravelPublicBrowserPath,
  isTravelPublicHost,
  toInternalTravelPath,
  toPublicTravelPath,
} from "@/lib/travel-paths";

function nextWithCrmPathname(req: NextRequest): NextResponse {
  const pathname = req.nextUrl.pathname;
  const h = new Headers(req.headers);
  h.set("x-crm-pathname", pathname);
  return NextResponse.next({ request: { headers: h } });
}

const isPublicRoute = createRouteMatcher([
  "/tourPackageQueryDisplay/(.*)",
  "/tourPackageQueryVariantDisplay/(.*)",
  "/tourPackageQueryPDFGenerator/(.*)",
  "/tourPackageQueryPDFGeneratorWithVariants/(.*)",
  "/tourPackagePDFGenerator/(.*)",
  "/tourPackagePDFGeneratorWithVariants/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/(.*)",
  "/api/whatsapp/webhook",
  "/api/internal/whatsapp/campaign-worker",
  "/travel",
  "/travel/offers",
  "/travel/packages",
  "/travel/packages/(.*)",
  "/travel/destinations",
  "/travel/destinations/(.*)",
  "/travel/account-deletion",
  "/travel/data-deletion",
  "/travel/privacy",
  "/travel/terms",
  "/travel/login",
  "/travel/chat",
  "/travel/chat/(.*)",
  "/travel/account",
  "/travel/guides",
  "/travel/guides/(.*)",
  "/travel/compare",
  "/api/travel/packages",
  "/api/travel/destinations",
  "/api/travel/search",
  "/api/travel/home-feed",
  "/api/travel/enquiry",
  "/api/travel/package-brochure/(.*)",
  "/api/tourPackageBySlug/(.*)",
  "/api/mcp",
]);

const isIgnoredRoute = createRouteMatcher([
  "/api/whatsapp/webhook",
  "/api/mobile/(.*)",
  "/api/chat/(.*)",
]);

/** Native app uses Bearer on these routes; Clerk session cookies are not sent. */
const isMobileBearerInquiryRoute = createRouteMatcher(["/api/inquiries(.*)"]);

function handleTravelPublicDomain(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/_next") || isTravelPublicApiPath(path)) {
    return null;
  }

  if (path === "/travel" || path.startsWith("/travel/")) {
    const url = req.nextUrl.clone();
    url.pathname = toPublicTravelPath(path);
    return NextResponse.redirect(url, 308);
  }

  if (isTravelPublicBrowserPath(path)) {
    const internal = toInternalTravelPath(path);
    const url = req.nextUrl.clone();
    url.pathname = internal;
    const h = new Headers(req.headers);
    h.set("x-crm-pathname", internal);
    h.set("x-travel-public", "1");
    return NextResponse.rewrite(url, { request: { headers: h } });
  }

  if (
    !path.startsWith("/sign-in") &&
    !path.startsWith("/sign-up") &&
    path !== "/favicon.ico" &&
    path !== "/robots.txt" &&
    path !== "/sitemap.xml"
  ) {
    return NextResponse.redirect(adminDashboardUrl(path), 302);
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication entirely for webhook
  if (isIgnoredRoute(req)) {
    return nextWithCrmPathname(req);
  }

  // Native apps send Bearer JWT (no session cookies). When the token is expired
  // or invalid, auth.protect() below can hang or redirect instead of returning
  // JSON — the app then shows "Check your connection". Let the route handler
  // resolve auth via getRequestClerkUserId and return 401/403 JSON.
  if (isMobileBearerInquiryRoute(req)) {
    const bearer = req.headers.get("Authorization");
    if (bearer?.startsWith("Bearer ")) {
      return nextWithCrmPathname(req);
    }
  }

  const hostname = req.headers.get("host") || "";
  const isAssociateDomain = hostname.includes("associate.aagamholidays.com");
  const isOpsDomain = hostname.includes("ops.aagamholidays.com");
  const isTravelPublicDomain = isTravelPublicHost(hostname);
  const path = req.nextUrl.pathname;

  if (isTravelPublicDomain) {
    const travelResponse = handleTravelPublicDomain(req);
    if (travelResponse) {
      return travelResponse;
    }
  }

  const isPublicTravelPage =
    isTravelPublicDomain && isTravelPublicBrowserPath(path);

  // Protect non-public routes
  if (!isPublicRoute(req) && !isPublicTravelPage) {
    await auth.protect();
  }

  const { userId } = await auth();

  // Travel public domain only serves the marketing site — skip admin domain rules.
  if (isTravelPublicDomain) {
    return nextWithCrmPathname(req);
  }

  // Handle ops domain restrictions
  if (isOpsDomain) {
    if (!userId && !path.startsWith("/sign-in")) {
      const url = new URL("/sign-in", req.url);
      return NextResponse.redirect(url);
    }

    if (userId && !path.startsWith("/sign-in")) {
      return nextWithCrmPathname(req);
    }
  }

  // Only apply restrictions for associate domains
  if (isAssociateDomain) {
    // Associates are only allowed to access specific routes
    const isAllowedPath =
      path.startsWith("/inquiries") ||
      path.startsWith("/tourpackagequery") ||
      path.startsWith("/tourpackagequeryfrominquiry") ||
      path.startsWith("/tourPackageQueryDisplay") ||
      path.startsWith("/tourPackages") ||
      path.startsWith("/api/inquiries") ||
      path.startsWith("/tourpackagequeryfrominquiry/associate") ||
      path.startsWith("/api/tourPackages") ||
      path.startsWith("/api/locations") ||
      path.startsWith("/api/tourPackageQuery") ||
      path.startsWith("/api/meal-plans") ||
      path.startsWith("/api/occupancy-types") ||
      path.startsWith("/api/room-types") ||
      path.startsWith("/api/vehicle-types") ||
      path.startsWith("/api/hotels") ||
      path.startsWith("/api/activitiesMaster") ||
      path.startsWith("/api/itinerariesMaster") ||
      path.startsWith("/api/pricing") ||
      path === "/" ||
      path.startsWith("/sign-in") ||
      path.startsWith("/sign-up") ||
      path.startsWith("/api/auth") ||
      path === "/api/associate-partners/me";

    if (!isAllowedPath) {
      const url = new URL("/inquiries", req.url);
      return NextResponse.redirect(url);
    }
  }

  return nextWithCrmPathname(req);
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
