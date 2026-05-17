import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

/**
 * `/api/mobile/**` skips path RBAC, so settings endpoints enforce the
 * module permission explicitly. Settings & audit are owner/admin only
 * (associates never get settings.* or audit.read).
 */
async function load(
  userId: string,
  permission: "settings.read" | "settings.write" | "audit.read"
) {
  const [membership, ia] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(
    membership?.role ?? null,
    ia.isAssociate
  );
  if (!profile.permissions.includes(permission)) {
    return { ok: false as const, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { ok: true as const };
}

export function requireSettingsRead(userId: string) {
  return load(userId, "settings.read");
}

export function requireSettingsWrite(userId: string) {
  return load(userId, "settings.write");
}

export function requireAuditRead(userId: string) {
  return load(userId, "audit.read");
}
