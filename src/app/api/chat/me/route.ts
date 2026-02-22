import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/chat/me - Get current user's travel app profile
export async function GET() {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isApproved: true,
      },
    });

    if (!travelUser) {
      return NextResponse.json({ userId: null });
    }

    return NextResponse.json({ userId: travelUser.id, user: travelUser });
  });
}
