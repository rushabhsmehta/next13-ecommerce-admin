import { NextResponse } from "next/server";
import { verifyToken } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true, phone: true },
    });
    if (!travelUser) return new NextResponse("User not found", { status: 404 });

    const body = await req.json();
    const { locationId, name, phone, journeyDate, numAdults, remarks } = body;

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

    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName: name.trim(),
        customerMobileNumber: phone.trim(),
        locationId,
        numAdults: numAdults ? Math.max(1, Number(numAdults)) : 1,
        journeyDate: journeyDate ? new Date(journeyDate) : undefined,
        remarks: remarks?.trim() || undefined,
        status: "PENDING",
        // fb_client_id stores the TravelAppUser ID for mobile-submitted inquiries
        fb_client_id: travelUser.id,
      },
    });

    return NextResponse.json({ success: true, inquiryId: inquiry.id }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_ENQUIRY_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
