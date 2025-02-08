import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/api/:path*","/tourPackageQueryDisplay/:path*", "/generatePDFfromURL/:path*","/tourPackageQueryPDFGenerator/:path*"],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
