import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const MAX_BATCH = 200;

export async function POST(
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

    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.messageIds) ? body.messageIds : [];
    const messageIds = ids
      .filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
      .slice(0, MAX_BATCH);

    if (messageIds.length === 0) {
      return NextResponse.json({ marked: 0 });
    }

    // Constrain to messages in this group, exclude own messages and deleted ones.
    const eligible = await prismadb.chatMessage.findMany({
      where: {
        id: { in: messageIds },
        chatGroupId: params.groupId,
        isDeleted: false,
        senderId: { not: travelUser.id },
      },
      select: { id: true },
    });

    if (eligible.length === 0) {
      return NextResponse.json({ marked: 0 });
    }

    // Bulk insert; ignore duplicates via the (chatMessageId, travelAppUserId) unique key.
    await prismadb.chatMessageRead.createMany({
      data: eligible.map((m) => ({
        chatMessageId: m.id,
        travelAppUserId: travelUser.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ marked: eligible.length });
  });
}
