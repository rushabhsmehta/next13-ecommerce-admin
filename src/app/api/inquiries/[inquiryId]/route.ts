import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { createAuditLog } from "@/lib/utils/audit-logger";

const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY"];

export async function GET(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {
  try {
    if (!params.inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }    const inquiry = await prismadb.inquiry.findUnique({
      where: {
        id: params.inquiryId,
      },
      include: {
        location: true,
        associatePartner: true,
        roomAllocations: {
          include: {
            roomType: true,
            occupancyType: true,
            mealPlan: true
          }
        },
        transportDetails: {
          include: {
            vehicleType: true
          }
        }
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
    const user = await currentUser();
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
      remarks
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

    // Fetch the original inquiry data for audit logging
    const originalInquiry = await prismadb.inquiry.findUnique({
      where: { id: params.inquiryId },
      include: {
        location: true,
        associatePartner: true
      }
    });

    if (!originalInquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Determine user role (ADMIN or ASSOCIATE)
    // Check if user email matches any associate partner's email
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";
    let isAssociate = false;
    let userRole: "ADMIN" | "ASSOCIATE" = "ADMIN";

    if (userEmail) {
      const associatePartner = await prismadb.associatePartner.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { gmail: userEmail }
          ]
        }
      });
      
      isAssociate = !!associatePartner;
      userRole = isAssociate ? "ASSOCIATE" : "ADMIN";
    }

    // Create the updated data object
    const updatedData = {
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
      remarks: remarks || null
    };

    // Update the inquiry in the database
    const inquiry = await prismadb.inquiry.update({
      where: {
        id: params.inquiryId,
      },
      data: updatedData,
      include: {
        location: true,
        associatePartner: true
      }
    });

    // Log the audit entry
    await createAuditLog({
      entityId: params.inquiryId,
      entityType: "Inquiry",
      action: "UPDATE",
      before: originalInquiry,
      after: inquiry,
      userRole,
      metadata: {
        locationName: originalInquiry.location?.label,
        updatedLocationName: inquiry.location?.label,
        associatePartnerName: originalInquiry.associatePartner?.name,
        updatedAssociatePartnerName: inquiry.associatePartner?.name,
        isStatusChanged: originalInquiry.status !== inquiry.status,
        statusChangedFrom: originalInquiry.status,
        statusChangedTo: inquiry.status,
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
    const user = await currentUser();

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
        tourPackageQueries: true,
        location: true,
        associatePartner: true
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Determine user role (ADMIN or ASSOCIATE)
    const userEmail = user?.emailAddresses[0]?.emailAddress || "";
    let userRole: "ADMIN" | "ASSOCIATE" = "ADMIN";

    if (userEmail) {
      const associatePartner = await prismadb.associatePartner.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { gmail: userEmail }
          ]
        }
      });
      
      userRole = associatePartner ? "ASSOCIATE" : "ADMIN";
    }

    // Process deletion as before
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

    // Log the audit entry for deletion
    await createAuditLog({
      entityId: params.inquiryId,
      entityType: "Inquiry",
      action: "DELETE",
      before: inquiry,
      userRole,
      metadata: {
        locationName: inquiry.location?.label,
        associatePartnerName: inquiry.associatePartner?.name,
        customerName: inquiry.customerName,
        status: inquiry.status,
        relatedActions: inquiry.actions.length,
        relatedQueries: inquiry.tourPackageQueries.length
      }
    });

    console.log(`[INQUIRY_DELETE] Successfully deleted inquiry: ${params.inquiryId}`);
    return NextResponse.json(deletedInquiry);
  } catch (error) {
    console.error('[INQUIRY_DELETE]', error);
    return new NextResponse(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}
