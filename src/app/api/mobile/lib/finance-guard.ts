import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

/**
 * Finance is org-staff only (associates never get finance.*). Enforces
 * `finance.write` for money-movement endpoints.
 */
export async function requireFinanceWrite(
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(
    membership?.role ?? null,
    inquiryAccess.isAssociate
  );
  if (!profile.permissions.includes("finance.write")) {
    return { ok: false, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { ok: true };
}

export function readIdempotencyKey(req: Request): string | null {
  const k = req.headers.get("Idempotency-Key");
  return k && k.trim().length > 0 ? k.trim() : null;
}

/**
 * Schema-free idempotency: every mobile money write records an AuditLog row
 * carrying `metadata.idempotencyKey`. Before inserting, we look that key up
 * scoped to the entity type. If a prior row exists we return its entityId so
 * the caller can respond 200 with the original record instead of double-
 * writing (which would drift balances).
 */
export async function findPriorIdempotentEntityId(
  entityType: string,
  key: string | null
): Promise<string | null> {
  if (!key) return null;
  try {
    const prior = await prismadb.auditLog.findFirst({
      where: {
        entityType,
        metadata: {
          path: "$.idempotencyKey",
          equals: key,
        },
      },
      select: { entityId: true },
      orderBy: { createdAt: "desc" },
    });
    return prior?.entityId ?? null;
  } catch (error) {
    // If JSON path filtering is unavailable, fail open (do not block the
    // write) but log — duplicate risk is bounded by client idempotency keys
    // and the short retry window.
    console.error("[FINANCE_IDEMPOTENCY_LOOKUP]", error);
    return null;
  }
}
