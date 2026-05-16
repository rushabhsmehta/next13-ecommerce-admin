import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

/**
 * `/api/mobile/**` skips path RBAC, so operations endpoints enforce the
 * module permission explicitly. Operations is org-staff master data
 * (associates never get operations.*).
 */
async function load(userId: string, permission: "operations.read" | "operations.write") {
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

export function requireOperationsRead(userId: string) {
  return load(userId, "operations.read");
}

export function requireOperationsWrite(userId: string) {
  return load(userId, "operations.write");
}
