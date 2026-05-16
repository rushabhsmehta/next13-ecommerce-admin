import prismadb from "@/lib/prismadb";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * Whether this export request arrived with an Authorization: Bearer ... header.
 * Used to gate the mobile-only audit row so we don't double-log web exports
 * (the web path has its own audit logging hooks elsewhere).
 */
export function isMobileBearerExportRequest(req: Request): boolean {
  const header = req.headers.get("Authorization");
  return !!header && header.startsWith("Bearer ");
}

interface MobileExportAuditParams {
  userId: string;
  entityType: "InquiryContactsExport" | "QueryContactsExport";
  bytes: number;
  rows: number;
}

/**
 * Record a single audit row for a mobile-initiated CRM export so admins can
 * see who pulled which data set. Best-effort: never fails the export.
 */
export async function recordMobileExportAudit(params: MobileExportAuditParams): Promise<void> {
  try {
    let userEmail = "unknown";
    let userName = "Mobile user";
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

    await prismadb.auditLog.create({
      data: {
        entityId: params.userId,
        entityType: params.entityType,
        action: "CREATE",
        userId: params.userId,
        userEmail,
        userName,
        userRole: "ADMIN",
        metadata: {
          source: "mobile-admin",
          bytes: params.bytes,
          rows: params.rows,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("[MOBILE_EXPORT_AUDIT]", error);
  }
}
