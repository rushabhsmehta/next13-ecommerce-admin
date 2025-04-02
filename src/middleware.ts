import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth, authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/api/:path*",
    "/tourPackageQueryDisplay/:path*",
    "/generatePDFfromURL/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
  ],
  
  async beforeAuth(req) {
    const userAgent = req.headers.get("user-agent") || "";
    const hostname = req.headers.get("host") || "";
    
    console.log(`[Middleware beforeAuth] Host: ${hostname}, Path: ${req.nextUrl.pathname}`);

    // ✅ Allow Puppeteer (Headless Chrome) to bypass authentication
    if (userAgent.includes("HeadlessChrome") || userAgent.includes("Puppeteer")) {
      return NextResponse.next();
    }

    // Check if the request is coming from associate domain
    if (hostname === "associate.aagamholidays.com") {
      const url = req.nextUrl.clone();
      const path = url.pathname;

      // Always direct root path to /inquiries
      if (path === "/") {
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }

      // Allow access only to the inquiries route and necessary assets
      if (!path.startsWith("/inquiries") && 
          !path.startsWith("/api/inquiries") && 
          !path.startsWith("/_next") && 
          !path.startsWith("/favicon.ico") &&
          !path.startsWith("/images") &&
          !path.startsWith("/fonts")) {
        // Redirect to inquiries page
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }
    }
  },

  async afterAuth(auth, req) {
    const hostname = req.headers.get("host") || "";
    
    if (hostname === "associate.aagamholidays.com") {
      console.log("[Middleware afterAuth] Associate domain access:", {
        userId: auth.userId,
        // Check for userId instead of isSignedIn
        signedIn: !!auth.userId,
        path: req.nextUrl.pathname
      });
    }
    
    // If user is on associate domain, ensure they only access inquiries
    if (hostname === "associate.aagamholidays.com") {
      const url = req.nextUrl.clone();
      const path = url.pathname;
      
      // Always direct root path to /inquiries
      if (path === "/") {
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }
      
      if (!path.startsWith("/inquiries") && 
          !path.startsWith("/api/inquiries") && 
          !path.startsWith("/_next") && 
          !path.startsWith("/favicon.ico") &&
          !path.startsWith("/images") &&
          !path.startsWith("/fonts")) {
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

