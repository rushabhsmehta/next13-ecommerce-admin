import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ groupId: string }> }
) {
  const params = await props.params;
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!travelUser) return jsonError("User not found", 404);

    const body = await req.json().catch(() => ({}));
    if (typeof body.notificationsMuted !== "boolean") {
      return jsonError("notificationsMuted must be a boolean", 400);
    }

    const member = await prismadb.chatGroupMember.update({
      where: {
        chatGroupId_travelAppUserId: {
          chatGroupId: params.groupId,
          travelAppUserId: travelUser.id,
        },
      },
      data: { notificationsMuted: body.notificationsMuted },
      select: {
        id: true,
        chatGroupId: true,
        travelAppUserId: true,
        notificationsMuted: true,
      },
    });

    return NextResponse.json({ member });
  });
}
