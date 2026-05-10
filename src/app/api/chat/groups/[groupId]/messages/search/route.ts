import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;

export async function GET(
  req: Request,
  props: { params: Promise<{ groupId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });
    if (!travelUser) return jsonError("User not found", 404);

    const membership = await prismadb.chatGroupMember.findUnique({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
    });
    if (!membership || !membership.isActive) {
      return jsonError("Not a member of this group", 403);
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limitParam = parseInt(url.searchParams.get("limit") ?? "30", 10);
    const limit = Math.min(Math.max(limitParam || 30, 1), MAX_LIMIT);

    if (q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const results = await prismadb.chatMessage.findMany({
      where: {
        chatGroupId: params.groupId,
        isDeleted: false,
        messageType: "TEXT",
        content: { contains: q },
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ results, query: q });
  });
}
