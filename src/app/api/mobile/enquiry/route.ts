import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { createRequestedCouponRedemption } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true, phone: true },
    });
    if (!travelUser) return new NextResponse("User not found", { status: 404 });

    const body = await req.json();
    const {
      locationId,
      name,
      phone,
      journeyDate,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      remarks,
      couponCode,
      packageId,
      source,
    } = body;

    if (!locationId || typeof locationId !== "string") {
      return new NextResponse("locationId is required", { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("name is required", { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return new NextResponse("phone is required", { status: 400 });
    }

    const location = await prismadb.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) return new NextResponse("Invalid location", { status: 400 });

    const enrichedRemarks = [
      remarks?.trim(),
      source === "offer" ? "Source: Active package offer" : null,
      packageId ? `Package ID: ${packageId}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName: name.trim(),
        customerMobileNumber: phone.trim(),
        locationId,
        numAdults: numAdults ? Math.max(1, Number(numAdults)) : 1,
        numChildrenAbove11: numChildrenAbove11 ? Math.max(0, Number(numChildrenAbove11)) : 0,
        numChildren5to11: numChildren5to11 ? Math.max(0, Number(numChildren5to11)) : 0,
        numChildrenBelow5: numChildrenBelow5 ? Math.max(0, Number(numChildrenBelow5)) : 0,
        journeyDate: journeyDate ? new Date(journeyDate) : undefined,
        remarks: enrichedRemarks || undefined,
        status: "PENDING",
        // fb_client_id stores the TravelAppUser ID for mobile-submitted inquiries
        fb_client_id: travelUser.id,
      },
    });

    if (couponCode) {
      try {
        await createRequestedCouponRedemption({
          couponCode,
          inquiryId: inquiry.id,
          locationId,
          customerName: name.trim(),
          customerMobile: phone.trim(),
          travelAppUserId: travelUser.id,
          travelDate: journeyDate ? new Date(journeyDate) : null,
          numAdults: numAdults ? Math.max(1, Number(numAdults)) : 1,
        });
      } catch (couponError) {
        console.log("[MOBILE_ENQUIRY_COUPON]", couponError);
      }
    }

    return NextResponse.json({ success: true, inquiryId: inquiry.id }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_ENQUIRY_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
