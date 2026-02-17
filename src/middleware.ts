import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/tourPackageQueryDisplay/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
    "/sign-in",
    "/sign-up",
    "/api/auth/:path*",
    "/api/whatsapp/webhook",  // Only webhook is public for Meta callbacks
    "/travel",                // Travel app public pages
    "/travel/packages",
    "/travel/packages/:path*",
    "/travel/destinations",
    "/travel/destinations/:path*",
    "/api/travel/packages",   // Travel app public APIs
    "/api/travel/destinations",
    "/api/travel/search",
  ],
  
  // Use ignoredRoutes for webhook endpoints to completely bypass authentication
  ignoredRoutes: [
    // Webhook needs to completely bypass middleware for Meta to access it
    "/api/whatsapp/webhook",
  ],
  
  async afterAuth(auth, req) {
    // Check if the request is from an associate domain
    const hostname = req.headers.get('host') || '';
    const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
    const isOpsDomain = hostname.includes('ops.aagamholidays.com');
    
    // Get current path
    const path = req.nextUrl.pathname;
    
    // Handle ops domain restrictions
    if (isOpsDomain) {
      // If user is not authenticated and not on sign-in page, redirect to sign-in
      if (!auth.userId && !path.startsWith('/sign-in')) {
        const url = new URL('/sign-in', req.url);
        return NextResponse.redirect(url);
      }
      
      // Check if user is operational staff (you might want to add a custom metadata check here)
      if (auth.userId && !path.startsWith('/sign-in')) {
        // For now, allow access to all ops routes for authenticated users
        // You can add additional role-based checks here later
        return NextResponse.next();
      }
    }
    
    // Only apply restrictions for associate domains
    if (isAssociateDomain) {      // Associates are only allowed to access the inquiries page, tour package query from inquiry (associate), tour package display, tour packages (view-only), sign-in, sign-up and API routes
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
        // Redirect associates to the inquiries page when they try to access other routes
        const url = new URL('/inquiries', req.url);
        return NextResponse.redirect(url);
      }
    } 
    
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
