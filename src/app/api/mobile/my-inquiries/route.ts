import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!travelUser) return new NextResponse("User not found", { status: 404 });

    const inquiries = await prismadb.inquiry.findMany({
      where: { fb_client_id: travelUser.id },
      include: {
        location: { select: { label: true } },
        assignedStaff: { select: { name: true, email: true } },
        actions: {
          orderBy: { actionDate: "desc" },
          take: 1,
          select: { actionType: true, remarks: true, actionDate: true },
        },
        tourPackageQueries: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, createdAt: true },
        },
        couponRedemptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            code: true,
            status: true,
            discountAmount: true,
            validationMessage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = inquiries.map((inq) => ({
      id: inq.id,
      status: inq.status,
      location: inq.location.label,
      numAdults: inq.numAdults,
      numChildrenAbove11: inq.numChildrenAbove11,
      numChildren5to11: inq.numChildren5to11,
      numChildrenBelow5: inq.numChildrenBelow5,
      journeyDate: inq.journeyDate,
      nextFollowUpDate: inq.nextFollowUpDate,
      assignedStaff: inq.assignedStaff
        ? { name: inq.assignedStaff.name, email: inq.assignedStaff.email }
        : null,
      latestQuote: inq.tourPackageQueries[0] ?? null,
      coupon: inq.couponRedemptions[0] ?? null,
      createdAt: inq.createdAt,
      updatedAt: inq.updatedAt,
      lastAction: inq.actions[0] ?? null,
    }));

    return NextResponse.json({ inquiries: formatted });
  } catch (error) {
    console.log("[MOBILE_MY_INQUIRIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
