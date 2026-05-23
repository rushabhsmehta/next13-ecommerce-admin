import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

type MemberCtx = {
  travelUserId: string;
  role: string;
  notificationsMuted: boolean;
};

async function loadMembership(
  req: Request,
  groupId: string
): Promise<{ ok: true; ctx: MemberCtx } | { ok: false; res: NextResponse }> {
  const userId = await getRequestClerkUserId(req);
  if (!userId) return { ok: false, res: jsonError("Unauthorized", 401) };

  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
  });
  if (!travelUser) return { ok: false, res: jsonError("User not found", 404) };

  const membership = await prismadb.chatGroupMember.findUnique({
    where: {
      chatGroupId_travelAppUserId: {
        chatGroupId: groupId,
        travelAppUserId: travelUser.id,
      },
    },
  });
  if (!membership || !membership.isActive) {
    return { ok: false, res: jsonError("Not a member of this group", 403) };
  }

  return {
    ok: true,
    ctx: {
      travelUserId: travelUser.id,
      role: membership.role,
      notificationsMuted: membership.notificationsMuted,
    },
  };
}

export async function GET(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const loaded = await loadMembership(req, params.groupId);
    if (!loaded.ok) return loaded.res;

    const group = await prismadb.chatGroup.findUnique({
      where: { id: params.groupId },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        tourPackageQueryId: true,
        tourStartDate: true,
        tourEndDate: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!group) return jsonError("Group not found", 404);

    return NextResponse.json({
      group,
      myRole: loaded.ctx.role,
      notificationsMuted: loaded.ctx.notificationsMuted,
    });
  });
}

export async function PATCH(req: Request, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const loaded = await loadMembership(req, params.groupId);
    if (!loaded.ok) return loaded.res;

    if (!["ADMIN", "OPERATIONS"].includes(loaded.ctx.role)) {
      return jsonError("Only admins and operations staff can edit the group", 403);
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return jsonError("name cannot be empty", 400);
      if (name.length > 200) return jsonError("name too long", 400);
      data.name = name;
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim() || null;
    } else if (body.description === null) {
      data.description = null;
    }
    if (typeof body.imageUrl === "string") {
      const url = body.imageUrl.trim();
      data.imageUrl = url || null;
    } else if (body.imageUrl === null) {
      data.imageUrl = null;
    }
    if (typeof body.tourPackageQueryId === "string") {
      data.tourPackageQueryId = body.tourPackageQueryId.trim() || null;
    } else if (body.tourPackageQueryId === null) {
      data.tourPackageQueryId = null;
    }
    if (body.tourStartDate !== undefined) {
      data.tourStartDate = body.tourStartDate
        ? dateToUtc(body.tourStartDate as string | Date)
        : null;
    }
    if (body.tourEndDate !== undefined) {
      data.tourEndDate = body.tourEndDate
        ? dateToUtc(body.tourEndDate as string | Date)
        : null;
    }
    // Only ADMIN can toggle active state.
    if (typeof body.isActive === "boolean") {
      if (loaded.ctx.role !== "ADMIN") {
        return jsonError("Only admins can archive or activate a group", 403);
      }
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return jsonError("No editable fields provided", 400);
    }

    const updated = await prismadb.chatGroup.update({
      where: { id: params.groupId },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        tourPackageQueryId: true,
        tourStartDate: true,
        tourEndDate: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ group: updated });
  });
}
