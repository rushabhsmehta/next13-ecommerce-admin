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
        actions: {
          orderBy: { actionDate: "desc" },
          take: 1,
          select: { actionType: true, remarks: true, actionDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = inquiries.map((inq) => ({
      id: inq.id,
      status: inq.status,
      location: inq.location.label,
      numAdults: inq.numAdults,
      journeyDate: inq.journeyDate,
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
