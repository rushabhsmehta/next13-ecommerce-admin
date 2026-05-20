import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

async function loadProfile(userId: string) {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  return buildMobileAdminProfile(membership?.role ?? null, inquiryAccess.isAssociate);
}

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("admin.dashboard.read")) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const { count } = await prismadb.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    return NextResponse.json({ markedAsRead: count });
  } catch (error) {
    console.log("[MOBILE_NOTIFICATIONS_MARK_ALL_READ]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}
