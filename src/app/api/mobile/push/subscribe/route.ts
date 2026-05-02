import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { validateAdminToken } from "@/app/api/mobile/lib/auth";

export async function POST(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { expoPushToken } = body;

    if (!expoPushToken || typeof expoPushToken !== "string") {
      return new NextResponse("expoPushToken required", { status: 400 });
    }

    await prismadb.adminMobileToken.update({
      where: { id: admin.id },
      data: { pushToken: expoPushToken },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("[MOBILE_PUSH_SUBSCRIBE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await validateAdminToken(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    await prismadb.adminMobileToken.update({
      where: { id: admin.id },
      data: { pushToken: null },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MOBILE_PUSH_SUBSCRIBE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
