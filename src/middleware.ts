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
    const hostname = req.headers.get("host") || "";

    // ✅ Allow Puppeteer (Headless Chrome) to bypass authentication
    if (userAgent.includes("HeadlessChrome") || userAgent.includes("Puppeteer")) {
      return NextResponse.next();
    }

    // Check if the request is coming from associate domain
    if (hostname === "associate.aagamholidays.com") {
      const url = req.nextUrl.clone();
      const path = url.pathname;

      // Allow access only to the inquiries route and its API endpoints
      if (!path.startsWith("/inquiries") && 
          !path.startsWith("/api/inquiries") && 
          !path.startsWith("/_next") && 
          !path.startsWith("/favicon.ico") &&
          !path.startsWith("/images") &&
          !path.startsWith("/fonts") &&
          path !== "/") {
        // Redirect to inquiries page
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }
    }
  },

  async afterAuth(auth, req) {
    const hostname = req.headers.get("host") || "";
    
    // If user is on associate domain, ensure they only access inquiries
    if (hostname === "associate.aagamholidays.com") {
      const url = req.nextUrl.clone();
      const path = url.pathname;
      
      if (!path.startsWith("/inquiries") && 
          !path.startsWith("/api/inquiries") && 
          !path.startsWith("/_next") && 
          !path.startsWith("/favicon.ico") &&
          !path.startsWith("/images") &&
          !path.startsWith("/fonts") &&
          path !== "/") {
        url.pathname = "/inquiries";
        return NextResponse.redirect(url);
      }
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

