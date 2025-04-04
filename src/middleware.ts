import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Get the authorized admin email from environment variables
const AUTHORIZED_ADMIN_EMAIL = process.env.NEXT_PUBLIC_AUTHORIZED_ADMIN_EMAIL || 'aagamholiday@gmail.com';

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
      
      // Associates are only allowed to access the inquiries page, sign-in, sign-up and API routes
      const isAllowedPath = 
        path.startsWith('/inquiries') || 
        path.startsWith('/api/inquiries') || 
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
    // For non-associate domains, restrict access to the authorized admin email only
    else if (auth.userId) {
      // If user is authenticated, check email
      const userEmail = auth.user?.emailAddresses?.[0]?.emailAddress || '';
      
      // Allow access only if the email matches the authorized admin email
      if (userEmail !== AUTHORIZED_ADMIN_EMAIL) {
        // User is not authorized, redirect to sign-in page with an error message
        const signInUrl = new URL('/sign-in', req.url);
      //  signInUrl.searchParams.set('error', 'unauthorized_email');
        return NextResponse.redirect(signInUrl);
      }
    }
    
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};