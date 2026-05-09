import { NextResponse } from "next/server";
import { verifyToken } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const header = req.headers.get("Authorization");
    const jwt = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!jwt) return new NextResponse("Unauthorized", { status: 401 });

    let userId: string;
    try {
      const payload = await verifyToken(jwt, { secretKey: process.env.CLERK_SECRET_KEY! });
      userId = payload.sub as string;
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [orgMembership, travelUser, inquiryAccess] = await Promise.all([
      (prismadb as any).organizationMember.findFirst({
        where: { userId, isActive: true, role: { in: ["ADMIN", "OWNER"] } },
      }),
      prismadb.travelAppUser.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, name: true, email: true, isApproved: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);

    return NextResponse.json({
      isAdmin: !!orgMembership,
      isAssociate: inquiryAccess.isAssociate,
      associatePartner: inquiryAccess.associatePartner,
      travelUser,
    });
  } catch (error) {
    console.log("[MOBILE_AUTH_STATUS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
