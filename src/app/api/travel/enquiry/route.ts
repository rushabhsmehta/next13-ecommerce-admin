import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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

    const normalizedPhone = phone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return new NextResponse("Invalid phone number", { status: 400 });
    }

    const location = await prismadb.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) return new NextResponse("Invalid location", { status: 400 });

    let travelUserId: string | undefined;
    const clerkUserId = await getRequestClerkUserId(req);
    if (clerkUserId) {
      const travelUser = await prismadb.travelAppUser.findUnique({
        where: { clerkUserId },
        select: { id: true },
      });
      travelUserId = travelUser?.id;
    }

    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName: name.trim(),
        customerMobileNumber: normalizedPhone,
        locationId,
        numAdults: numAdults ? Math.max(1, Number(numAdults)) : 1,
        numChildrenAbove11: numChildrenAbove11
          ? Math.max(0, Number(numChildrenAbove11))
          : 0,
        numChildren5to11: numChildren5to11
          ? Math.max(0, Number(numChildren5to11))
          : 0,
        numChildrenBelow5: numChildrenBelow5
          ? Math.max(0, Number(numChildrenBelow5))
          : 0,
        journeyDate: journeyDate ? dateToUtc(new Date(journeyDate)) : undefined,
        remarks: remarks?.trim() || undefined,
        status: "pending",
        fb_client_id: travelUserId,
      },
    });

    return NextResponse.json({ success: true, inquiryId: inquiry.id }, { status: 201 });
  } catch (error) {
    console.log("[TRAVEL_ENQUIRY_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
