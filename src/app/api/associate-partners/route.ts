import { NextResponse } from "next/server";
import { getRequestClerkUserId } from "@/lib/clerk-request-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getRequestClerkUserId(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();

    const { name, mobileNumber, email, gmail } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!mobileNumber) {
      return new NextResponse("Mobile number is required", { status: 400 });
    }

    const associatePartner = await prismadb.associatePartner.create({
      data: {
        name,
        mobileNumber,
        email,
        gmail,
      },
    });

    return NextResponse.json(associatePartner);
  } catch (error) {
    console.log("[ASSOCIATE_PARTNERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getRequestClerkUserId(req);
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const access = await resolveInquiryAccessContext(userId);
    if (!access.isAdminLike) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const associatePartners = await prismadb.associatePartner.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        gmail: true,
        isActive: true,
      },
    });

    return NextResponse.json(associatePartners);
  } catch (error) {
    console.log("[ASSOCIATE_PARTNERS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
