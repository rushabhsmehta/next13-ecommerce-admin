import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

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
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/auth/(.*)",
  "/api/whatsapp/webhook",
  "/api/internal/whatsapp/campaign-worker",
  "/travel",
  "/travel/packages",
  "/travel/packages/(.*)",
  "/travel/destinations",
  "/travel/destinations/(.*)",
  "/travel/account-deletion",
  "/travel/data-deletion",
  "/api/travel/packages",
  "/api/travel/destinations",
  "/api/travel/search",
  "/api/tourPackageBySlug/(.*)",
  "/api/mcp",
]);

const isIgnoredRoute = createRouteMatcher([
  "/api/whatsapp/webhook",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication entirely for webhook
  if (isIgnoredRoute(req)) {
    return nextWithCrmPathname(req);
  }

  // Check if the request is from an associate domain
  const hostname = req.headers.get('host') || '';
  const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
  const isOpsDomain = hostname.includes('ops.aagamholidays.com');

  // Get current path
  const path = req.nextUrl.pathname;

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();

  // Handle ops domain restrictions
  if (isOpsDomain) {
    if (!userId && !path.startsWith('/sign-in')) {
      const url = new URL('/sign-in', req.url);
      return NextResponse.redirect(url);
    }

    if (userId && !path.startsWith('/sign-in')) {
      return nextWithCrmPathname(req);
    }
  }

  // Only apply restrictions for associate domains
  if (isAssociateDomain) {
    // Associates are only allowed to access specific routes
    const isAllowedPath =
      path.startsWith('/inquiries') ||
      path.startsWith('/tourpackagequery') ||
      path.startsWith('/tourpackagequeryfrominquiry') ||
      path.startsWith('/tourPackageQueryDisplay') ||
      path.startsWith('/tourPackages') ||
      path.startsWith('/api/inquiries') ||
      path.startsWith('/tourpackagequeryfrominquiry/associate') ||
      path.startsWith('/api/tourPackages') ||
      path.startsWith('/api/locations') ||
      path.startsWith('/api/tourPackageQuery') ||
      path.startsWith('/api/meal-plans') ||
      path.startsWith('/api/occupancy-types') ||
      path.startsWith('/api/room-types') ||
      path.startsWith('/api/vehicle-types') ||
      path.startsWith('/api/hotels') ||
      path.startsWith('/api/activitiesMaster') ||
      path.startsWith('/api/itinerariesMaster') ||
      path.startsWith('/api/pricing') ||
      path === '/' ||
      path.startsWith('/sign-in') ||
      path.startsWith('/sign-up') ||
      path.startsWith('/api/auth') ||
      path === '/api/associate-partners/me';

    if (!isAllowedPath) {
      const url = new URL('/inquiries', req.url);
      return NextResponse.redirect(url);
    }
  }

  return nextWithCrmPathname(req);
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
