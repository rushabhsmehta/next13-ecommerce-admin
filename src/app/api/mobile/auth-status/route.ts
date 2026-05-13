import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const [orgMembership, travelUser, inquiryAccess] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { role: true, organizationId: true },
      }),
      prismadb.travelAppUser.findUnique({
        where: { clerkUserId: userId },
        select: { id: true, name: true, email: true, isApproved: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    const mobileAdmin = buildMobileAdminProfile(
      orgMembership?.role ?? null,
      inquiryAccess.isAssociate
    );

    return NextResponse.json({
      ...mobileAdmin,
      organizationId: orgMembership?.organizationId ?? null,
      isAdmin: mobileAdmin.isAdmin,
      isAssociate: inquiryAccess.isAssociate,
      associatePartner: inquiryAccess.associatePartner,
      travelUser,
    });
  } catch (error) {
    console.log("[MOBILE_AUTH_STATUS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
