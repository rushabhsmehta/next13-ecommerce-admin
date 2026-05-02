import { NextResponse } from "next/server";
import crypto from "crypto";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mobileNumber, accessToken } = body;

    if (!accessToken) {
      return new NextResponse("Access token required", { status: 400 });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(accessToken)
      .digest("hex");

    const record = await prismadb.adminMobileToken.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      return new NextResponse("Invalid access token", { status: 401 });
    }

    await prismadb.adminMobileToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      adminId: record.id,
      userId: record.userId,
      role: "admin",
      name: record.userName ?? "Admin",
      mobileNumber: mobileNumber ?? "",
      token: accessToken,
    });
  } catch (error) {
    console.log("[MOBILE_AUTH_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
