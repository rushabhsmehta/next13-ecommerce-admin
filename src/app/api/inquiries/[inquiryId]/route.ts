import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];

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
      journeyDate,
      remarks  // Add this line to extract remarks
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

    if (!body.status) {
      return new NextResponse("Status is required", { status: 400 });
    }

    if (!validStatuses.includes(body.status)) {
      return new NextResponse("Invalid status value", { status: 400 });
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
        journeyDate: new Date(journeyDate),
        remarks: remarks || null // Store remarks, default to null if not provided
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

    console.log(`[INQUIRY_DELETE] Attempting to delete inquiry: ${params.inquiryId}`);

    // First, check if the inquiry exists and get its related records
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      include: {
        actions: true,
        tourPackageQueries: true
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Log the related records for debugging
    console.log(`[INQUIRY_DELETE] Found inquiry with ${inquiry.actions.length} actions and ${inquiry.tourPackageQueries.length} package queries`);

    // Delete the inquiry actions first (these are directly related)
    if (inquiry.actions.length > 0) {
      await prismadb.inquiryAction.deleteMany({
        where: { inquiryId: params.inquiryId }
      });
      console.log(`[INQUIRY_DELETE] Deleted ${inquiry.actions.length} related inquiry actions`);
    }

    // Update tour package queries to remove reference to this inquiry
    if (inquiry.tourPackageQueries.length > 0) {
      await prismadb.tourPackageQuery.updateMany({
        where: { inquiryId: params.inquiryId },
        data: { inquiryId: null }
      });
      console.log(`[INQUIRY_DELETE] Updated ${inquiry.tourPackageQueries.length} related tour package queries`);
    }

    // Finally, delete the inquiry
    const deletedInquiry = await prismadb.inquiry.delete({
      where: { id: params.inquiryId }
    });

    console.log(`[INQUIRY_DELETE] Successfully deleted inquiry: ${params.inquiryId}`);
    return NextResponse.json(deletedInquiry);
  } catch (error) {
    console.error('[INQUIRY_DELETE]', error);
    return new NextResponse(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
