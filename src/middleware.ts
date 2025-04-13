import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

// Middleware to verify the staff's authentication token
// Interface for JWT payload structure
interface StaffJwtPayload {
  sub?: string;      // subject identifier
  iat?: number;      // issued at timestamp
  exp?: number;      // expiration timestamp
  [key: string]: any; // additional custom claims
}

/**
 * Verifies the staff authentication token from cookies
 * @param req The Next.js request object
 * @returns The decoded JWT payload or null if verification fails
 */
async function verifyStaffToken(req: NextRequest): Promise<StaffJwtPayload | null> {
  const token = req.cookies.get('ops_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default-secret-key-change-in-production'
    );

    const { payload } = await jwtVerify(token, secret);
    return payload as StaffJwtPayload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export default authMiddleware({
  publicRoutes: [
    "/api/:path*",
    "/tourPackageQueryDisplay/:path*",
    "/generatePDFfromURL/:path*",
    "/tourPackageQueryPDFGenerator/:path*",
    "/sign-in", // Add sign-in to public routes to prevent redirect loops
    "/ops/login",
    "/ops/api/auth/ops/signin",
    "/ops/api/auth/ops/signout"
  ],
  
  async beforeAuth(req) {
    const userAgent = req.headers.get("user-agent") || "";
    const hostname = req.headers.get('host') || '';
    const path = req.nextUrl.pathname;
    
    // Check if this is the operational staff subdomain
    const isOpsSubdomain = hostname.includes('ops.aagamholidays.com');
    
    // If this is the operational staff subdomain, handle authentication separately
    if (isOpsSubdomain) {
      // Allow access to login page and auth API routes without authentication
      if (path === '/login' || path === '/' || path.startsWith('/api/auth/ops/')) {
        return NextResponse.next();
      }
      
      // For all other routes, verify operational staff authentication
      const staffPayload = await verifyStaffToken(req);
      
      if (!staffPayload) {
        // Redirect to login if no valid token is found
        const url = new URL('/login', req.url);
        return NextResponse.redirect(url);
      }
      
      // Valid token, allow access
      return NextResponse.next();
    }

    // ✅ Allow Puppeteer (Headless Chrome) to bypass authentication
    if (userAgent.includes("HeadlessChrome") || userAgent.includes("Puppeteer")) {
      return NextResponse.next();
    }
  },

  async afterAuth(auth, req) {
    // Check if the request is from an associate domain
    const hostname = req.headers.get('host') || '';
    const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
    const isOpsSubdomain = hostname.includes('ops.aagamholidays.com');
    
    // Get current path
    const path = req.nextUrl.pathname;
    
    // Skip Clerk auth for operational staff subdomain (handled in beforeAuth)
    if (isOpsSubdomain) {
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
    
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};