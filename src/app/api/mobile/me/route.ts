import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { validateClerkAdmin } from "@/app/api/mobile/lib/auth";

export async function GET(req: Request) {
  try {
    const admin = await validateClerkAdmin(req);
    if (!admin) return new NextResponse("Unauthorized", { status: 401 });

    const member = await (prismadb as any).organizationMember.findFirst({
      where: { userId: admin.userId, isActive: true },
    });

    return NextResponse.json({
      userId: admin.userId,
      role: admin.role,
      name: member?.email ?? "Admin",
    });
  } catch (error) {
    console.log("[MOBILE_ME]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
