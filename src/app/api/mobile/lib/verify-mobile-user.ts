import { verifyToken } from "@clerk/nextjs/server";
import { captureMobileAuditRequestContext } from "@/app/api/mobile/lib/mobile-audit";

function readBearer(req: Request): string | null {
  const header = req.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/**
 * True when this request used the static dev bypass bearer (non-production only).
 */
export function isMobileDevBypassRequest(req: Request): boolean {
  const bearer = readBearer(req);
  if (!bearer) return false;
  const enabled = process.env.MOBILE_DEV_AUTH_BYPASS_ENABLED === "1";
  const bypassToken = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim();
  const bypassUserId = process.env.MOBILE_DEV_AUTH_BYPASS_USER_ID?.trim();
  const isProd = process.env.NODE_ENV === "production";
  return Boolean(
    !isProd && enabled && bypassToken && bypassUserId && bearer === bypassToken
  );
}

/**
 * Resolve Clerk `user_…` id from `Authorization: Bearer <jwt>` or, in non-production
 * environments only, from a static dev bypass token.
 *
 * Enable on the server (.env.local):
 *   MOBILE_DEV_AUTH_BYPASS_ENABLED=1
 *   MOBILE_DEV_AUTH_BYPASS_TOKEN=<long random string>
 *   MOBILE_DEV_AUTH_BYPASS_USER_ID=user_xxxxxxxx   (must be a real Clerk user in your instance)
 *
 * Never set MOBILE_DEV_AUTH_BYPASS_ENABLED in production.
 */
export async function verifyMobileBearerUserId(req: Request): Promise<string | null> {
  captureMobileAuditRequestContext(req);
  const bearer = readBearer(req);
  if (!bearer) return null;

  const enabled = process.env.MOBILE_DEV_AUTH_BYPASS_ENABLED === "1";
  const bypassToken = process.env.MOBILE_DEV_AUTH_BYPASS_TOKEN?.trim();
  const bypassUserId = process.env.MOBILE_DEV_AUTH_BYPASS_USER_ID?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (
    !isProd &&
    enabled &&
    bypassToken &&
    bypassUserId &&
    bearer === bypassToken
  ) {
    console.warn("[MOBILE_AUTH_BYPASS] Dev-only bearer accepted — disable in shared/staging environments");
    return bypassUserId;
  }

  try {
    const payload = await verifyToken(bearer, { secretKey: process.env.CLERK_SECRET_KEY! });
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}
