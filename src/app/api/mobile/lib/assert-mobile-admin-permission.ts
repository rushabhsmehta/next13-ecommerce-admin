import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  buildMobileAdminProfile,
  type MobileAdminPermission,
} from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export async function requireMobileAdminPermission(
  userId: string,
  permission: MobileAdminPermission
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

  if (!profile.permissions.includes(permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
    };
  }

  return { ok: true };
}

