import prismadb from "@/lib/prismadb";
import { clerkClient } from "@clerk/nextjs/server";
import { AsyncLocalStorage } from "async_hooks";

const APP_VARIANTS = new Set(["public", "staff", "finance"]);
const auditContext = new AsyncLocalStorage<{ appVariant?: string }>();

export function getMobileAppVariantFromRequest(req: Request): string | undefined {
  const raw = req.headers.get("X-Mobile-App-Variant")?.trim().toLowerCase();
  return APP_VARIANTS.has(raw ?? "") ? raw : undefined;
}

export function captureMobileAuditRequestContext(req: Request): void {
  auditContext.enterWith({
    appVariant: getMobileAppVariantFromRequest(req),
  });
}

/**
 * Whether this request arrived with an Authorization: Bearer ... header.
 * Used to gate mobile-only audit rows so we don't double-log web requests
 * (the web path has its own audit logging hooks elsewhere).
 */
export function isMobileBearerRequest(req: Request): boolean {
  const header = req.headers.get("Authorization");
  return !!header && header.startsWith("Bearer ");
}

export type MobileAuditAction = "CREATE" | "UPDATE" | "DELETE" | "READ";

interface MobileAuditParams {
  userId: string;
  entityType: string;
  entityId: string;
  action: MobileAuditAction;
  metadata?: Record<string, unknown>;
}

/**
 * Record a single audit row for a mobile-initiated mutation. Best-effort: never
 * fails the underlying request. Mirrors the shape used by the web audit logger
 * but tags `source: "mobile-admin"` so admins can distinguish mobile activity.
 */
export async function recordMobileAudit(params: MobileAuditParams): Promise<void> {
  try {
    let userEmail = "unknown";
    let userName = "Mobile user";
    let userRole = "ADMIN";
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(params.userId);
      userEmail = user.emailAddresses[0]?.emailAddress ?? userEmail;
      userName =
        user.fullName ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        userEmail;
    } catch {
      // best-effort: keep defaults
    }

    try {
      const membership = await prismadb.organizationMember.findFirst({
        where: { userId: params.userId, isActive: true },
        select: { role: true },
      });
      if (membership?.role) userRole = membership.role;
    } catch {
      // best-effort
    }

    await prismadb.auditLog.create({
      data: {
        entityId: params.entityId,
        entityType: params.entityType,
        action: params.action,
        userId: params.userId,
        userEmail,
        userName,
        userRole,
        metadata: {
          source: "mobile-admin",
          ...(auditContext.getStore()?.appVariant
            ? { appVariant: auditContext.getStore()?.appVariant }
            : {}),
          ...(params.metadata ?? {}),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[MOBILE_AUDIT]", error);
  }
}
