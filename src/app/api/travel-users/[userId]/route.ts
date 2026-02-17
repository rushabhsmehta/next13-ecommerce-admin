import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/travel-users/[userId]
export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  return handleApi(async () => {
    const { userId: clerkId } = auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

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

// PATCH /api/travel-users/[userId] - Update user (approve, deactivate, etc.)
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleApi(async () => {
    const { userId: clerkId } = auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

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

// DELETE /api/travel-users/[userId] - Deactivate user
export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  return handleApi(async () => {
    const { userId: clerkId } = auth();
    if (!clerkId) return jsonError("Unauthorized", 401);

    await prismadb.travelAppUser.update({
      where: { id: params.userId },
      data: { isActive: false, isApproved: false },
    });

    return NextResponse.json({ success: true });
  });
}
