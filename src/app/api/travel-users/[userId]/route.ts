import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { getUserOrgRole, roleAtLeast } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/travel-users/[userId] (admin only)
export async function GET(_req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    const role = await getUserOrgRole(clerkId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: admin access required", 403);
    }

    const user = await prismadb.travelAppUser.findUnique({
      where: { id: params.userId },
      include: {
        chatMemberships: {
          where: { isActive: true },
          include: {
            chatGroup: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },
        _count: {
          select: { chatMessages: true },
        },
      },
    });

    if (!user) return jsonError("User not found", 404);

    return NextResponse.json(user);
  });
}

// PATCH /api/travel-users/[userId] - Update user (admin only)
export async function PATCH(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    const role = await getUserOrgRole(clerkId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: admin access required", 403);
    }

    const body = await req.json();
    const { name, phone, isApproved, isActive, avatarUrl } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (isApproved !== undefined) updateData.isApproved = isApproved;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const user = await prismadb.travelAppUser.update({
      where: { id: params.userId },
      data: updateData,
    });

    return NextResponse.json(user);
  });
}

// DELETE /api/travel-users/[userId] - Deactivate user (admin only)
export async function DELETE(_req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId: clerkId } = await auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    const role = await getUserOrgRole(clerkId);
    if (!roleAtLeast(role, "ADMIN")) {
      return jsonError("Forbidden: admin access required", 403);
    }

    await prismadb.travelAppUser.update({
      where: { id: params.userId },
      data: { isActive: false, isApproved: false },
    });

    return NextResponse.json({ success: true });
  });
}
