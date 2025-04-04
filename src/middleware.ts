import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Get the authorized admin email from environment variables
const AUTHORIZED_ADMIN_EMAIL = 'aagamholiday@gmail.com';

// Debug function to log authentication details
// Define interfaces for type safety
interface AuthUser {
  emailAddresses?: Array<{
    emailAddress?: string;
  }>;
}

interface Auth {
  userId?: string | null;
  user?: AuthUser;
}

interface RequestHeaders {
  get(name: string): string | null;
}

interface NextRequest {
  nextUrl: {
    pathname: string;
  };
  headers: RequestHeaders;
}

function logAuthDetails(auth: Auth, req: NextRequest, message: string): void {
  console.log("---------- AUTH DEBUG ----------");
  console.log("Message:", message);
  console.log("Path:", req.nextUrl.pathname);
  console.log("Host:", req.headers.get('host'));
  console.log("Auth userId:", auth.userId);
  console.log("User email:", auth.user?.emailAddresses?.[0]?.emailAddress);
  console.log("Authorized email:", AUTHORIZED_ADMIN_EMAIL);
  console.log("Email match:", auth.user?.emailAddresses?.[0]?.emailAddress === AUTHORIZED_ADMIN_EMAIL);
  console.log("--------------------------------");
}

export default authMiddleware({
  publicRoutes: [
    "/api/:path*",
    "/tourPackageQueryDisplay/:path*",
    "/generatePDFfromURL/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
    // Add the sign-in route to public routes to prevent redirect loops
    "/sign-in",
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
    const isAdminDomain = hostname.includes('admin.aagamholidays.com');
    
    // Get current path
    const path = req.nextUrl.pathname;
    const isSignInPath = path.startsWith('/sign-in');
    
    // Don't redirect if already on sign-in page
    if (isSignInPath) {
      return NextResponse.next();
    }
    
    // Only apply restrictions for associate domains
    if (isAssociateDomain) {
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
    // For admin domain, check if user is authorized
    else if (isAdminDomain && auth.userId) {
      // If user is authenticated, check email
      const userEmail = auth.user?.emailAddresses?.[0]?.emailAddress || '';
      
      logAuthDetails(auth, req, "Admin domain check");
      
      // Check if the email matches exactly (case insensitive)
      if (userEmail.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        // User is not authorized, redirect to sign-in page with an error message
        logAuthDetails(auth, req, "Redirecting unauthorized user");
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('error', 'unauthorized_email');
        return NextResponse.redirect(signInUrl);
      }
    }
    
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};