import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";

export const dynamic = "force-dynamic";

function iso(value: any) {
  return value?.toISOString?.() ?? value ?? null;
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    const guard = await requireMobileAdminPermission(userId, "travelAppAdmin.read");
    if (!guard.ok) return guard.response;

    const [users, chatGroups, adminTokens, mobileTokenCount, activeMobileTokenCount, marketingDeviceCount] = await Promise.all([
      prismadb.travelAppUser.findMany({
        include: {
          _count: {
            select: {
              chatMemberships: { where: { isActive: true } },
              chatMessages: true,
              mobilePushTokens: { where: { isActive: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prismadb.chatGroup.findMany({
        include: {
          members: {
            where: { isActive: true },
            include: {
              travelAppUser: {
                select: { id: true, name: true, email: true, phone: true, isApproved: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prismadb.adminMobileToken.findMany({
        select: { id: true, userId: true, userName: true, pushToken: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prismadb.mobilePushToken.count(),
      prismadb.mobilePushToken.count({ where: { isActive: true } }),
      prismadb.devicePushToken.count({
        where: { isActive: true, marketingOptIn: true, appVariant: "public" },
      }),
    ]);

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isApproved: user.isApproved,
        isActive: user.isActive,
        clerkUserId: user.clerkUserId,
        createdAt: iso(user.createdAt),
        updatedAt: iso(user.updatedAt),
        chatGroupCount: user._count.chatMemberships,
        messageCount: user._count.chatMessages,
        activePushTokenCount: user._count.mobilePushTokens,
      })),
      chatGroups: chatGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        tourPackageQueryId: group.tourPackageQueryId,
        tourStartDate: iso(group.tourStartDate),
        tourEndDate: iso(group.tourEndDate),
        isActive: group.isActive,
        createdAt: iso(group.createdAt),
        updatedAt: iso(group.updatedAt),
        messageCount: group._count.messages,
        members: group.members.map((member) => ({
          id: member.id,
          travelAppUserId: member.travelAppUserId,
          role: member.role,
          isActive: member.isActive,
          joinedAt: iso(member.joinedAt),
          user: member.travelAppUser,
        })),
      })),
      mobileAccess: {
        adminTokens: adminTokens.map((token) => ({
          id: token.id,
          userId: token.userId,
          userName: token.userName,
          hasPushToken: !!token.pushToken,
          updatedAt: iso(token.updatedAt),
        })),
        mobileTokenCount,
        activeMobileTokenCount,
        marketingDeviceCount,
      },
    });
  } catch (error) {
    console.log("[MOBILE_TRAVEL_ADMIN_OVERVIEW_GET]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

