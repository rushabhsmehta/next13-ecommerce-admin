import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const user = await currentUser();
    const userName =
      user?.fullName ||
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
      "Admin";

    const body = await req.json().catch(() => ({}));
    const label = body.label ?? "Mobile Admin";

    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    const existing = await prismadb.adminMobileToken.findFirst({
      where: { userId },
    });

    if (existing) {
      await prismadb.adminMobileToken.update({
        where: { id: existing.id },
        data: { tokenHash, label, userName, lastUsedAt: null, pushToken: null },
      });
    } else {
      await prismadb.adminMobileToken.create({
        data: { tokenHash, label, userId, userName },
      });
    }

    return NextResponse.json({ token: plainToken, label, userName });
  } catch (error) {
    console.log("[MOBILE_TOKEN_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    await prismadb.adminMobileToken.deleteMany({ where: { userId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log("[MOBILE_TOKEN_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    const token = await prismadb.adminMobileToken.findFirst({
      where: { userId },
      select: {
        id: true,
        label: true,
        userName: true,
        pushToken: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(token ?? null);
  } catch (error) {
    console.log("[MOBILE_TOKEN_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
