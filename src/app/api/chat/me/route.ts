import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/chat/me - Get current user's travel app profile
export async function GET(req: Request) {
  return handleApi(async () => {
    const userId = await getRequestClerkUserId(req);
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
