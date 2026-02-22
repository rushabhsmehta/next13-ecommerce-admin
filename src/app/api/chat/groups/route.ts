import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

// GET /api/chat/groups - List chat groups for authenticated user
export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    // Find the travel app user by clerk ID
    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

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
      lastMessage: m.chatGroup.messages[0] || null,
    }));

    return NextResponse.json({ groups });
  });
}

// POST /api/chat/groups - Create a new chat group (admin/ops only)
export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    // Only ADMIN or OWNER can create chat groups
    const role = await getUserOrgRole(userId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: only admins can create chat groups", 403);
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

    // Add members if provided
    if (memberIds && Array.isArray(memberIds)) {
      const validRoles = ["ADMIN", "OPERATIONS", "TOURIST", "COMPANION"] as const;
      await prismadb.chatGroupMember.createMany({
        data: memberIds.map(
          (m: { userId: string; role: string }) => ({
            chatGroupId: group.id,
            travelAppUserId: m.userId,
            role: (validRoles.includes(m.role as any) ? m.role : "TOURIST") as any,
          })
        ),
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
