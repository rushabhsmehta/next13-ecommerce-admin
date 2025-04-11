import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY"];

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.inquiryId) {
      return new NextResponse("Inquiry id is required", { status: 400 });
    }

    if (!body.status || !validStatuses.includes(body.status)) {
      return new NextResponse("Invalid status value", { status: 400 });
    }

    const inquiry = await prismadb.inquiry.update({
      where: {
        id: params.inquiryId,
      },
      data: {
        status: body.status,
      }
    });
  
    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_STATUS_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
