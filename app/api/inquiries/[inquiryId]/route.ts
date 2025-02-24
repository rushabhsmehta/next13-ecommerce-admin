import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    if (!params.inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }

    const inquiry = await prismadb.inquiry.findUnique({
      where: {
        id: params.inquiryId,
      },
      include: {
        location: true,
        associatePartner: true
      }
    });
  
    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const {
      customerName,
      customerMobileNumber,
      locationId,
      associatePartnerId,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      status,
      journeyDate,  // Add this line
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!customerName) {
      return new NextResponse("Customer name is required", { status: 400 });
    }

    if (!params.inquiryId) {
      return new NextResponse("Inquiry id is required", { status: 400 });
    }

    const inquiry = await prismadb.inquiry.updateMany({
      where: {
        id: params.inquiryId,
      },
      data: {
        customerName,
        customerMobileNumber,
        locationId,
        associatePartnerId,
        numAdults,
        numChildrenAbove11,
        numChildren5to11,
        numChildrenBelow5,
        status,
        journeyDate: new Date(journeyDate),  // Add this line
      }
    });
  
    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.inquiryId) {
      return new NextResponse("Inquiry id is required", { status: 400 });
    }

    const inquiry = await prismadb.inquiry.deleteMany({
      where: {
        id: params.inquiryId,
      }
    });
  
    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
