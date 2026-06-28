import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  deactivateDevicePushToken,
  isValidExpoPushToken,
  linkDeviceTokenToTravelUser,
  upsertDevicePushToken,
} from "@/lib/device-push-token";

export const dynamic = "force-dynamic";

const PUBLIC_VARIANT = "public";

async function resolveTravelAppUserId(req: Request): Promise<string | null> {
  const clerkUserId = await verifyMobileBearerUserId(req);
  if (!clerkUserId) return null;
  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  return travelUser?.id ?? null;
}

/** Register install-level push token — no sign-in required (Aagam Holidays public app). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const expoPushToken: unknown = body.expoPushToken;
    const platform: unknown = body.platform;
    const appVariant =
      typeof body.appVariant === "string" && body.appVariant.trim()
        ? body.appVariant.trim()
        : PUBLIC_VARIANT;

    if (typeof expoPushToken !== "string" || expoPushToken.length === 0) {
      return new NextResponse("expoPushToken required", { status: 400 });
    }
    if (!isValidExpoPushToken(expoPushToken)) {
      return new NextResponse("invalid expoPushToken format", { status: 400 });
    }

    const travelAppUserId = await resolveTravelAppUserId(req);

    await upsertDevicePushToken({
      expoPushToken,
      platform: typeof platform === "string" ? platform : null,
      appVariant,
      travelAppUserId,
    });

    if (travelAppUserId) {
      await linkDeviceTokenToTravelUser(expoPushToken, travelAppUserId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_DEVICE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const expoPushToken: unknown = body.expoPushToken;

    if (typeof expoPushToken === "string" && expoPushToken.length > 0) {
      await deactivateDevicePushToken(expoPushToken);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_DEVICE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
