import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export const dynamic = "force-dynamic";

function isExpoToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

export async function POST(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const expoPushToken = body.expoPushToken;
    const userName = body.userName;

    if (typeof expoPushToken !== "string" || expoPushToken.length === 0) {
      return new NextResponse("expoPushToken required", { status: 400 });
    }
    if (!isExpoToken(expoPushToken)) {
      return new NextResponse("invalid expoPushToken format", { status: 400 });
    }

    await prismadb.adminMobileToken.upsert({
      where: { userId: admin.userId },
      create: {
        userId: admin.userId,
        userName: typeof userName === "string" ? userName : null,
        pushToken: expoPushToken,
      },
      update: {
        pushToken: expoPushToken,
        ...(typeof userName === "string" ? { userName } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_ADMIN_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    await prismadb.adminMobileToken.updateMany({
      where: { userId: admin.userId },
      data: { pushToken: null },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MOBILE_PUSH_REGISTER_ADMIN_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
