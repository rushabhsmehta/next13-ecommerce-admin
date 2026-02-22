import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return jsonError("Invalid push subscription data", 400);
    }

    // Upsert subscription by endpoint
    const existing = await prismadb.pushSubscription.findFirst({
      where: {
        travelAppUserId: travelUser.id,
        endpoint,
      },
    });

    if (existing) {
      await prismadb.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          isActive: true,
        },
      });
    } else {
      await prismadb.pushSubscription.create({
        data: {
          travelAppUserId: travelUser.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    }

    return NextResponse.json({ success: true });
  });
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });

    if (!travelUser) return jsonError("User not found", 404);

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) return jsonError("Endpoint is required", 400);

    await prismadb.pushSubscription.updateMany({
      where: {
        travelAppUserId: travelUser.id,
        endpoint,
      },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  });
}
