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

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function formatNotification(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    data: row.data,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const profile = await loadProfile(userId);
    if (!profile.permissions.includes("admin.dashboard.read")) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const where = unreadOnly ? { read: false } : {};
    const [notifications, unreadCount] = await Promise.all([
      prismadb.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prismadb.notification.count({ where: { read: false } }),
    ]);

    return NextResponse.json({
      notifications: notifications.map(formatNotification),
      unreadCount,
    });
  } catch (error) {
    console.log("[MOBILE_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}
