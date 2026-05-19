import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole } from "@/lib/authz";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

async function latestPinnedAnnouncement(groupId: string) {
  return prismadb.chatMessage.findFirst({
    where: { chatGroupId: groupId, isPinned: true, isDeleted: false },
    orderBy: { pinnedAt: "desc" },
    select: {
      id: true,
      content: true,
      messageType: true,
      isAnnouncement: true,
      isImportant: true,
      pinnedAt: true,
      createdAt: true,
      sender: { select: { id: true, name: true } },
    },
  });
}

async function unreadCountForGroup(groupId: string, travelAppUserId: string | null) {
  if (!travelAppUserId) return 0;
  return prismadb.chatMessage.count({
    where: {
      chatGroupId: groupId,
      isDeleted: false,
      senderId: { not: travelAppUserId },
      reads: { none: { travelAppUserId } },
    },
  });
}

async function enrichGroups<T extends { id: string; myRole?: string }>(
  groups: T[],
  travelAppUserId: string | null
) {
  return Promise.all(
    groups.map(async (group) => {
      const [latestPinned, unreadCount, membership] = await Promise.all([
        latestPinnedAnnouncement(group.id),
        unreadCountForGroup(group.id, travelAppUserId),
        travelAppUserId
          ? prismadb.chatGroupMember.findUnique({
              where: {
                chatGroupId_travelAppUserId: {
                  chatGroupId: group.id,
                  travelAppUserId,
                },
              },
              select: { notificationsMuted: true, role: true },
            })
          : Promise.resolve(null),
      ]);

      return {
        ...group,
        myRole: group.myRole ?? membership?.role ?? null,
        unreadCount,
        notificationsMuted: membership?.notificationsMuted ?? false,
        latestPinnedAnnouncement: latestPinned,
      };
    })
  );
}

async function ensureTravelUserForStaff(userId: string) {
  const existing = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (existing) return existing;

  const member = await prismadb.organizationMember.findFirst({
    where: { userId, isActive: true },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  const email = member?.email?.trim().toLowerCase();
  if (!email) return null;

  const byEmail = await prismadb.travelAppUser.findUnique({
    where: { email },
    select: { id: true, clerkUserId: true },
  });
  if (byEmail) {
    if (!byEmail.clerkUserId) {
      await prismadb.travelAppUser.update({
        where: { id: byEmail.id },
        data: { clerkUserId: userId, isApproved: true, isActive: true },
      });
    }
    return { id: byEmail.id };
  }

  const created = await prismadb.travelAppUser.create({
    data: {
      name: email.split("@")[0] || "Staff",
      email,
      clerkUserId: userId,
      isApproved: true,
    },
    select: { id: true },
  });
  return created;
}

// GET /api/chat/groups - List chat groups for authenticated user
export async function GET(req: Request) {
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    // Check if org admin — admins see all groups
    const orgMembership = await prismadb.organizationMember.findFirst({
      where: { userId, isActive: true, role: { in: ["ADMIN", "OWNER"] } },
    });

    if (orgMembership) {
      const allGroups = await prismadb.chatGroup.findMany({
        where: { isActive: true },
        include: {
          members: {
            where: { isActive: true },
            include: {
              travelAppUser: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              content: true,
              messageType: true,
              createdAt: true,
              sender: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      const groups = allGroups.map((g) => ({
        ...g,
        myRole: "ADMIN",
        lastMessage: g.messages[0] ?? null,
      }));
      return NextResponse.json({
        groups: await enrichGroups(groups, travelUser?.id ?? null),
        isAdmin: true,
      });
    }

    if (!travelUser) {
      return NextResponse.json({ groups: [] });
    }

    const memberships = await prismadb.chatGroupMember.findMany({
      where: {
        travelAppUserId: travelUser.id,
        isActive: true,
      },
      include: {
        chatGroup: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                travelAppUser: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                content: true,
                messageType: true,
                createdAt: true,
                sender: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { chatGroup: { updatedAt: "desc" } },
    });

    const groups = memberships.map((m) => ({
      ...m.chatGroup,
      myRole: m.role,
      notificationsMuted: m.notificationsMuted,
      lastMessage: m.chatGroup.messages[0] || null,
    }));

    return NextResponse.json({ groups: await enrichGroups(groups, travelUser.id) });
  });
}

// POST /api/chat/groups - Create a new chat group (admin/ops only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    // Admin/operations staff can create chat groups.
    const role = await getUserOrgRole(userId);
    if (!role || !["ADMIN", "OWNER", "OPERATIONS"].includes(role)) {
      return jsonError("Forbidden: only admins and operations staff can create chat groups", 403);
    }

    const body = await req.json();
    const {
      name,
      description,
      tourPackageQueryId,
      tourStartDate,
      tourEndDate,
      memberIds,
    } = body;

    if (!name) return jsonError("Group name is required", 400);

    const group = await prismadb.chatGroup.create({
      data: {
        name,
        description,
        tourPackageQueryId,
        tourStartDate: tourStartDate ? dateToUtc(tourStartDate) : undefined,
        tourEndDate: tourEndDate ? dateToUtc(tourEndDate) : undefined,
        createdBy: userId,
      },
    });

    const validRoles = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"] as const;
    const creatorTravelUser = await ensureTravelUserForStaff(userId);
    const memberRows = Array.isArray(memberIds)
      ? memberIds.map((m: { userId: string; role: string }) => ({
          chatGroupId: group.id,
          travelAppUserId: m.userId,
          role: (validRoles.includes(m.role as any) ? m.role : "TOURIST") as any,
        }))
      : [];
    if (creatorTravelUser) {
      memberRows.push({
        chatGroupId: group.id,
        travelAppUserId: creatorTravelUser.id,
        role: "ADMIN" as any,
      });
    }
    if (memberRows.length > 0) {
      await prismadb.chatGroupMember.createMany({
        data: memberRows,
        skipDuplicates: true,
      });
    }

    const createdGroup = await prismadb.chatGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            travelAppUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return NextResponse.json(createdGroup, { status: 201 });
  });
}
