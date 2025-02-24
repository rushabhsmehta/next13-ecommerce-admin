import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { 
      customerName, 
      customerMobileNumber, 
      associatePartnerId,
      locationId,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      status
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!customerName) {
      return new NextResponse("Customer name is required", { status: 400 });
    }

    if (!customerMobileNumber) {
      return new NextResponse("Mobile number is required", { status: 400 });
    }

    if (!locationId) {
      return new NextResponse("Location is required", { status: 400 });
    }

    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName,
        customerMobileNumber,
        associatePartnerId,
        locationId,
        numAdults,
        numChildrenAbove11,
        numChildren5to11,
        numChildrenBelow5,
        status
      }
    });
  
    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRIES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const inquiries = await prismadb.inquiry.findMany({
      include: {
        location: true,
        associatePartner: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    return NextResponse.json(inquiries);
  } catch (error) {
    console.log('[INQUIRIES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
