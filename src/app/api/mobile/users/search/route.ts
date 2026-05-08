import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 20;

// GET /api/mobile/users/search?q=...&groupId=...
// Returns matching travel users so admin/ops can pick someone to add to a group.
// Caller must be ADMIN/OPERATIONS in the supplied group.
export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });
    if (!travelUser) return jsonError("User not found", 404);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const groupId = url.searchParams.get("groupId") ?? "";

    if (!groupId) return jsonError("groupId is required", 400);
    if (q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    // Caller must be admin/ops in this group.
    const membership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });
    if (!membership || !membership.isActive) {
      return jsonError("Not a member of this group", 403);
    }
    if (!["ADMIN", "OPERATIONS"].includes(membership.role)) {
      return jsonError("Only admins and operations staff can search users", 403);
    }

    // Match name or email; exclude existing active members of this group.
    const existing = await prismadb.chatGroupMember.findMany({
      where: { chatGroupId: groupId, isActive: true },
      select: { travelAppUserId: true },
    });
    const excludeIds = existing.map((m) => m.travelAppUserId);

    const users = await prismadb.travelAppUser.findMany({
      where: {
        AND: [
          { id: { notIn: excludeIds } },
          {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isApproved: true,
      },
      orderBy: { name: "asc" },
      take: MAX_RESULTS,
    });

    return NextResponse.json({ results: users, query: q });
  });
}
