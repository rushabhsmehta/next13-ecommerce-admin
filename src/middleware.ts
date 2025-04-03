import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/api/:path*",
    "/tourPackageQueryDisplay/:path*",
    "/generatePDFfromURL/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
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
    
    // Only apply restrictions for associate domains
    if (isAssociateDomain) {
      const path = req.nextUrl.pathname;
      
      // Associates are only allowed to access the inquiries page and API routes
      const isAllowedPath = 
        path.startsWith('/inquiries') || 
        path.startsWith('/api/inquiries') || 
        path === '/' || 
        path.startsWith('/sign-in') || 
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

