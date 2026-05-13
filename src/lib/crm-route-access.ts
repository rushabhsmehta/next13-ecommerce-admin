import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getUserOrgRole } from "@/lib/authz";
import {
  canAccessApiPath,
  isCrmApiRbacExcludedPath,
  lowerPath,
} from "@/lib/crm-route-access-rules";

/**
 * Enforce the same prefix rules as the dashboard for `/api/**` routes.
 * Call at the top of sensitive handlers after resolving `userId` from Clerk.
 * Skips checks on the associate portal host (existing allowlist in `proxy.ts`).
 */
export async function assertCrmApiAccessForRequest(
  userId: string | null | undefined,
  requestUrl: string
): Promise<void> {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  if (host.includes("associate.aagamholidays.com")) return;

  const pathname = lowerPath(new URL(requestUrl).pathname);
  if (isCrmApiRbacExcludedPath(pathname)) return;

  const ua = h.get("user-agent");

  if (!userId) {
    const err: any = new Error("Unauthenticated");
    err.statusCode = 401;
    throw err;
  }
  const role = await getUserOrgRole(userId);
  if (!canAccessApiPath(role, pathname, { userAgent: ua })) {
    const err: any = new Error("Forbidden");
    err.code = "FORBIDDEN";
    err.statusCode = 403;
    throw err;
  }
}

export function crmAccessErrorResponse(error: unknown): NextResponse | null {
  const e = error as { statusCode?: number; code?: string };
  if (e?.statusCode === 401) return new NextResponse("Unauthenticated", { status: 401 });
  if (e?.statusCode === 403 || e?.code === "FORBIDDEN") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return null;
}
