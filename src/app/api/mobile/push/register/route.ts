import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { linkDeviceTokenToTravelUser, upsertDevicePushToken } from "@/lib/device-push-token";

export const dynamic = "force-dynamic";

async function authTravelUser(req: Request): Promise<string | null> {
  const clerkUserId = await verifyMobileBearerUserId(req);
  if (!clerkUserId) return null;
  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  return travelUser?.id ?? null;
}

export async function POST(req: Request) {
  try {
    const travelAppUserId = await authTravelUser(req);
    if (!travelAppUserId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const expoPushToken: unknown = body.expoPushToken;
    const platform: unknown = body.platform;

    if (typeof expoPushToken !== "string" || expoPushToken.length === 0) {
      return new NextResponse("expoPushToken required", { status: 400 });
    }
    if (
      !expoPushToken.startsWith("ExponentPushToken[") &&
      !expoPushToken.startsWith("ExpoPushToken[")
    ) {
      return new NextResponse("invalid expoPushToken format", { status: 400 });
    }

    await prismadb.mobilePushToken.upsert({
      where: {
        travelAppUserId_expoPushToken: {
          travelAppUserId,
          expoPushToken,
        },
      },
      create: {
        travelAppUserId,
        expoPushToken,
        platform: typeof platform === "string" ? platform : null,
        isActive: true,
      },
      update: {
        isActive: true,
        platform: typeof platform === "string" ? platform : undefined,
      },
    });

    await upsertDevicePushToken({
      expoPushToken,
      platform: typeof platform === "string" ? platform : null,
      appVariant: "public",
      travelAppUserId,
    });
    await linkDeviceTokenToTravelUser(expoPushToken, travelAppUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const travelAppUserId = await authTravelUser(req);
    if (!travelAppUserId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const expoPushToken: unknown = body.expoPushToken;

    if (typeof expoPushToken === "string" && expoPushToken.length > 0) {
      await prismadb.mobilePushToken.updateMany({
        where: { travelAppUserId, expoPushToken },
        data: { isActive: false },
      });
    } else {
      // No specific token given — deactivate all tokens for this user (sign-out).
      await prismadb.mobilePushToken.updateMany({
        where: { travelAppUserId },
        data: { isActive: false },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
