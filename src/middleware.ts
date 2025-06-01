import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/tourPackageQueryDisplay/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
    "/sign-in",
    "/sign-up",
    // Add ops routes as public to avoid Clerk authentication for them
    "/ops/:path*",
    "/login",
    // Only make specific API routes public that don't need authentication
    "/api/auth/:path*",
  ],
  
  async beforeAuth(req) {
    const userAgent = req.headers.get("user-agent") || "";

    // ✅ Allow Puppeteer (Headless Chrome) to bypass authentication
    if (userAgent.includes("HeadlessChrome") || userAgent.includes("Puppeteer")) {
      return NextResponse.next();
    }
  },

  async afterAuth(auth, req) {
    // Check if the request is from an associate domain
    const hostname = req.headers.get('host') || '';
    const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
    
    // Get current path
    const path = req.nextUrl.pathname;
    
    // Only apply restrictions for associate domains
    if (isAssociateDomain) {      // Associates are only allowed to access the inquiries page, tour package query from inquiry (associate), sign-in, sign-up and API routes
      const isAllowedPath = 
        path.startsWith('/inquiries') || 
        path.startsWith('/api/inquiries') || 
        path.startsWith('/tourpackagequeryfrominquiry/associate') ||
        path.startsWith('/api/tourPackages') ||
        path.startsWith('/api/locations') ||
        path.startsWith('/api/tourPackageQuery') ||
        path.startsWith('/api/meal-plans') ||
        path.startsWith('/api/occupancy-types') ||
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
