import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { createAuditLog } from "@/lib/utils/audit-logger";

const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"];

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

    console.log('📤 SERVER GET ROUTE - RETURNING INQUIRY DATA:');
    console.log('=============================================');
    console.log('1. Retrieved inquiry journeyDate from database:', inquiry?.journeyDate);
    if (inquiry?.journeyDate) {
      console.log('2. Database journeyDate details:');
      console.log('   - toString():', inquiry.journeyDate.toString());
      console.log('   - toISOString():', inquiry.journeyDate.toISOString());
      console.log('   - getDate():', inquiry.journeyDate.getDate());
      console.log('   - getMonth():', inquiry.journeyDate.getMonth());
      console.log('   - getFullYear():', inquiry.journeyDate.getFullYear());
      console.log('   - getHours():', inquiry.journeyDate.getHours());
      console.log('   - getTimezoneOffset():', inquiry.journeyDate.getTimezoneOffset());
    } else {
      console.log('2. journeyDate from database is null/undefined');
    }
    console.log('=============================================');

    return NextResponse.json(inquiry);
  } catch (error) {
    console.log('[INQUIRY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { inquiryId: string } }
) {  try {
    const { userId } = auth();
    const user = await currentUser();
    const body = await req.json();
    
    console.log('[INQUIRY_PATCH] Received request body:', JSON.stringify(body, null, 2));

    // Support lightweight partial update when only nextFollowUpDate is being patched
    const isNextFollowUpOnly = (
      Object.prototype.hasOwnProperty.call(body, 'nextFollowUpDate') &&
      !Object.prototype.hasOwnProperty.call(body, 'customerName') &&
      !Object.prototype.hasOwnProperty.call(body, 'status') &&
      !Object.prototype.hasOwnProperty.call(body, 'journeyDate') &&
      !Object.prototype.hasOwnProperty.call(body, 'locationId') &&
      !Object.prototype.hasOwnProperty.call(body, 'associatePartnerId') &&
      !Object.prototype.hasOwnProperty.call(body, 'roomAllocations') &&
      !Object.prototype.hasOwnProperty.call(body, 'transportDetails')
    );

    if (isNextFollowUpOnly) {
      try {
        if (!userId) {
          return new NextResponse("Unauthenticated", { status: 403 });
        }
        if (!params.inquiryId) {
          return new NextResponse("Inquiry id is required", { status: 400 });
        }

        const originalInquiry = await prismadb.inquiry.findUnique({
          where: { id: params.inquiryId }
        });
        if (!originalInquiry) {
          return new NextResponse("Inquiry not found", { status: 404 });
        }

        // Allow clearing the follow-up date when client sends null explicitly
        const processedNextFollowUpDate = (body.nextFollowUpDate === null)
          ? null
          : dateToUtc(body.nextFollowUpDate);

        const inquiry = await prismadb.inquiry.update({
          where: { id: params.inquiryId },
          // @ts-ignore prisma client needs regeneration for new field in some environments
          data: { nextFollowUpDate: processedNextFollowUpDate }
        });

        await createAuditLog({
          entityId: params.inquiryId,
          entityType: "Inquiry",
          action: "UPDATE",
          before: originalInquiry,
          after: inquiry,
          userRole: "ADMIN", // Lightweight path; detailed role resolution not critical here
          metadata: {
            // @ts-ignore
            nextFollowUpDateBefore: (originalInquiry as any).nextFollowUpDate,
            // @ts-ignore
            nextFollowUpDateAfter: (inquiry as any).nextFollowUpDate,
            lightweight: true
          }
        });

        return NextResponse.json(inquiry);
      } catch (err) {
        console.error('[INQUIRY_PATCH][LIGHTWEIGHT_NEXT_FOLLOW_UP]', err);
        return new NextResponse("Internal error", { status: 500 });
      }
    }
    
    // Add comprehensive logging for journeyDate processing
    console.log('🔍 SERVER-SIDE JOURNEY DATE PROCESSING:');
    console.log('======================================');
    console.log('1. Raw journeyDate from request body:', body.journeyDate);
    console.log('2. journeyDate type:', typeof body.journeyDate);
    
    if (body.journeyDate) {
      console.log('3. Raw journeyDate string analysis:');
      console.log('   - Original string:', body.journeyDate);
      console.log('   - Parsed as Date:', new Date(body.journeyDate));
      console.log('   - Parsed Date toString():', new Date(body.journeyDate).toString());
      console.log('   - Parsed Date toISOString():', new Date(body.journeyDate).toISOString());
      console.log('   - Parsed Date getDate():', new Date(body.journeyDate).getDate());
      console.log('   - Parsed Date getMonth():', new Date(body.journeyDate).getMonth());
      console.log('   - Parsed Date getFullYear():', new Date(body.journeyDate).getFullYear());
    } else {
      console.log('3. journeyDate is null/undefined');
    }

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
      nextFollowUpDate,
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
    const { roomAllocations, transportDetails, ...mainFields } = body;

    console.log('4. Before dateToUtc processing:');
    console.log('   - journeyDate value:', journeyDate);
    
  const processedJourneyDate = dateToUtc(journeyDate);
  // Preserve explicit null to clear the date; undefined means "no change" in some contexts
  const processedNextFollowUpDate = (nextFollowUpDate === null)
    ? null
    : dateToUtc(nextFollowUpDate);
    console.log('5. After dateToUtc processing:');
    console.log('   - processedJourneyDate:', processedJourneyDate);
    if (processedJourneyDate) {
      console.log('   - processedJourneyDate toString():', processedJourneyDate.toString());
      console.log('   - processedJourneyDate toISOString():', processedJourneyDate.toISOString());
      console.log('   - processedJourneyDate getDate():', processedJourneyDate.getDate());
      console.log('   - processedJourneyDate getMonth():', processedJourneyDate.getMonth());
      console.log('   - processedJourneyDate getFullYear():', processedJourneyDate.getFullYear());
    }

    const updatedData: any = {
      customerName,
      customerMobileNumber,
      locationId,
      associatePartnerId,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      status,
      journeyDate: processedJourneyDate,
      // @ts-ignore prisma client needs regeneration
      nextFollowUpDate: processedNextFollowUpDate,
      remarks: remarks || null
    };
    
    console.log('6. Final updatedData.journeyDate for database:', updatedData.journeyDate);
    console.log('======================================');    // First, check if roomAllocations and transportDetails are actually present in the request
    console.log('[INQUIRY_PATCH] Room allocations present:', roomAllocations ? `Yes, count: ${roomAllocations.length}` : 'No');
    console.log('[INQUIRY_PATCH] Transport details present:', transportDetails ? `Yes, count: ${transportDetails.length}` : 'No');
    
    if (roomAllocations) {
      console.log('[INQUIRY_PATCH] Room allocations data:', JSON.stringify(roomAllocations, null, 2));
      // Delete existing room allocations
      const deletedRooms = await prismadb.roomAllocation.deleteMany({
        where: { inquiryId: params.inquiryId }
      });
      console.log(`[INQUIRY_PATCH] Deleted ${deletedRooms.count} existing room allocations`);
    }
    
    if (transportDetails) {
      console.log('[INQUIRY_PATCH] Transport details data:', JSON.stringify(transportDetails, null, 2));
      // Delete existing transport details
      const deletedTransport = await prismadb.transportDetail.deleteMany({
        where: { inquiryId: params.inquiryId }
      });
      console.log(`[INQUIRY_PATCH] Deleted ${deletedTransport.count} existing transport details`);
    }    // Prepare the room allocations data for creation
    let roomAllocationsCreateData = undefined;
    if (roomAllocations && roomAllocations.length > 0) {
      try {
        roomAllocationsCreateData = {
          create: roomAllocations.map((allocation: any) => {
            console.log('[INQUIRY_PATCH] Processing room allocation:', allocation);
            return {
              roomTypeId: allocation.roomTypeId,
              occupancyTypeId: allocation.occupancyTypeId,
              mealPlanId: allocation.mealPlanId === "" ? null : allocation.mealPlanId,
              quantity: Number(allocation.quantity) || 1,
              guestNames: allocation.guestNames || null,
              notes: allocation.notes || null
            };
          })
        };
        console.log('[INQUIRY_PATCH] Prepared room allocations create data:', JSON.stringify(roomAllocationsCreateData, null, 2));
      } catch (error) {
        console.error('[INQUIRY_PATCH] Error preparing room allocations:', error);
      }
    }

    // Prepare the transport details data for creation
    let transportDetailsCreateData = undefined;
    if (transportDetails && transportDetails.length > 0) {
      try {
        transportDetailsCreateData = {
          create: transportDetails.map((detail: any) => {
            console.log('[INQUIRY_PATCH] Processing transport detail:', detail);
            return {
              vehicleTypeId: detail.vehicleTypeId,
              quantity: Number(detail.quantity) || 1,
              isAirportPickupRequired: detail.isAirportPickupRequired || false,
              isAirportDropRequired: detail.isAirportDropRequired || false,
              pickupLocation: detail.pickupLocation || null,
              dropLocation: detail.dropLocation || null,
              requirementDate: dateToUtc(detail.requirementDate),
              notes: detail.notes || null
            };
          })
        };
        console.log('[INQUIRY_PATCH] Prepared transport details create data:', JSON.stringify(transportDetailsCreateData, null, 2));
      } catch (error) {
        console.error('[INQUIRY_PATCH] Error preparing transport details:', error);
      }
    }

    console.log('[INQUIRY_PATCH] Updating inquiry with prepared data');
    
    // Update the inquiry in the database
    const inquiry = await prismadb.inquiry.update({
      where: {
        id: params.inquiryId,
      },
      data: {
        ...updatedData,
        // Create new room allocations if provided
        roomAllocations: roomAllocationsCreateData,
        // Create new transport details if provided
        transportDetails: transportDetailsCreateData
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
        // @ts-ignore
        nextFollowUpDateBefore: (originalInquiry as any).nextFollowUpDate,
        // @ts-ignore
        nextFollowUpDateAfter: (inquiry as any).nextFollowUpDate
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
