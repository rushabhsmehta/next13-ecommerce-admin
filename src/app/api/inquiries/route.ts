import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  parseISO,
  format
} from "date-fns";
import { createAuditLog } from "@/lib/utils/audit-logger";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();
    const body = await req.json();    const { 
      customerName, 
      customerMobileNumber, 
      associatePartnerId,
      locationId,
      numAdults,
      numChildrenAbove11,
      numChildren5to11,
      numChildrenBelow5,
      status,
      journeyDate,
      remarks,
      roomAllocations,
      transportDetails
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

    if (!journeyDate) {
      return new NextResponse("Journey date is required", { status: 400 });
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
    }    const inquiry = await prismadb.inquiry.create({
      data: {
        customerName,
        customerMobileNumber,
        associatePartnerId,
        locationId,
        numAdults,
        numChildrenAbove11,
        numChildren5to11,
        numChildrenBelow5,
        status,
        journeyDate: dateToUtc(journeyDate),
        remarks: remarks || null,
        roomAllocations: roomAllocations ? {
          create: roomAllocations.map((allocation: any) => ({
            roomTypeId: allocation.roomTypeId,
            occupancyTypeId: allocation.occupancyTypeId,
            mealPlanId: allocation.mealPlanId,
            quantity: allocation.quantity || 1,
            guestNames: allocation.guestNames || null,
            notes: allocation.notes || null
          }))
        } : undefined,
        transportDetails: transportDetails ? {
          create: transportDetails.map((detail: any) => ({
            vehicleTypeId: detail.vehicleTypeId,
            quantity: detail.quantity || 1,
            isAirportPickupRequired: detail.isAirportPickupRequired || false,
            isAirportDropRequired: detail.isAirportDropRequired || false,
            pickupLocation: detail.pickupLocation || null,
            dropLocation: detail.dropLocation || null,
            requirementDate: detail.requirementDate ? new Date(new Date(detail.requirementDate).toISOString()) : null,
            notes: detail.notes || null
          }))
        } : undefined
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

    // Create a notification for the new inquiry
    try {
      const journeyDateFormatted = format(new Date(journeyDate), 'dd MMM yyyy');
      const locationName = inquiry.location?.label || 'Unknown location';
      const associateName = inquiry.associatePartner?.name || 'Direct inquiry';
      
      await prismadb.notification.create({
        data: {
          type: 'NEW_INQUIRY',
          title: 'New Inquiry Received',
          message: `${customerName} has inquired about ${locationName} for ${journeyDateFormatted}${associatePartnerId ? ` through ${associateName}` : ''}.`,
          data: { 
            inquiryId: inquiry.id,
            customerName,
            customerMobileNumber,
            locationId,
            locationName,
            journeyDate
          }
        }
      });
    } catch (notificationError) {
      // Log the error but don't fail the inquiry creation
      console.error('[INQUIRY_NOTIFICATION_ERROR]', notificationError);
    }

    // Create audit log for the new inquiry
    await createAuditLog({
      entityId: inquiry.id,
      entityType: "Inquiry",
      action: "CREATE",
      after: inquiry,
      userRole,
      metadata: {
        locationName: inquiry.location?.label,
        associatePartnerName: inquiry.associatePartner?.name,
        journeyDate: format(new Date(journeyDate), 'yyyy-MM-dd')
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
    const { userId } = auth();
    const url = new URL(req.url);

    // Extract query parameters
    const associateId = url.searchParams.get('associateId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const period = url.searchParams.get('period') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    // Build date range filters based on period
    let dateFilter = {};
    const now = new Date();
    
    if (period) {
      switch (period) {
        case 'TODAY':
          dateFilter = {
            createdAt: {
              gte: startOfDay(now),
              lte: endOfDay(now)
            }
          };
          break;
        case 'THIS_WEEK':
          dateFilter = {
            createdAt: {
              gte: startOfWeek(now, { weekStartsOn: 1 }),
              lte: endOfWeek(now, { weekStartsOn: 1 })
            }
          };
          break;
        case 'THIS_MONTH':
          dateFilter = {
            createdAt: {
              gte: startOfMonth(now),
              lte: endOfMonth(now)
            }
          };
          break;
        case 'LAST_MONTH':
          const lastMonth = subMonths(now, 1);
          dateFilter = {
            createdAt: {
              gte: startOfMonth(lastMonth),
              lte: endOfMonth(lastMonth)
            }
          };
          break;
        case 'CUSTOM':
          if (startDate && endDate) {
            try {
              const parsedStartDate = parseISO(startDate);
              const parsedEndDate = parseISO(endDate);
              
              // Set end date to end of day to include the entire day
              parsedEndDate.setHours(23, 59, 59, 999);
              
              dateFilter = {
                createdAt: {
                  gte: parsedStartDate,
                  lte: parsedEndDate
                }
              };
            } catch (error) {
              console.error("Invalid date format:", error);
            }
          }
          break;
      }
    }

    // Build the where clause
    const where = {
      ...(associateId && { associatePartnerId: associateId }),
      ...(status && status !== 'ALL' && { status }),
      ...dateFilter
    };    const inquiries = await prismadb.inquiry.findMany({
      where,
      include: {
        location: true,
        associatePartner: true,
        tourPackageQueries: true,
        actions: {
          orderBy: {
            createdAt: 'desc'
          }
        },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    console.log('[INQUIRIES_GET] Error:', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const url = new URL(req.url);
    const inquiryId = url.searchParams.get('id');

    if (!inquiryId) {
      return new NextResponse("Inquiry ID is required", { status: 400 });
    }

    console.log(`[INQUIRIES_DELETE] Attempting to delete inquiry: ${inquiryId}`);

    // First, check if the inquiry exists
    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        actions: true,
        tourPackageQueries: true
      }
    });

    if (!inquiry) {
      return new NextResponse("Inquiry not found", { status: 404 });
    }

    // Log the related records for debugging
    console.log(`[INQUIRIES_DELETE] Found inquiry with ${inquiry.actions.length} actions and ${inquiry.tourPackageQueries.length} package queries`);

    // Delete the inquiry actions first (these are directly related and should cascade)
    if (inquiry.actions.length > 0) {
      await prismadb.inquiryAction.deleteMany({
        where: { inquiryId: inquiryId }
      });
      console.log(`[INQUIRIES_DELETE] Deleted ${inquiry.actions.length} related inquiry actions`);
    }

    // Handle tour package queries - update them to remove reference to this inquiry
    if (inquiry.tourPackageQueries.length > 0) {
      await prismadb.tourPackageQuery.updateMany({
        where: { inquiryId: inquiryId },
        data: { inquiryId: null }
      });
      console.log(`[INQUIRIES_DELETE] Updated ${inquiry.tourPackageQueries.length} related tour package queries`);
    }

    // Finally, delete the inquiry
    const deletedInquiry = await prismadb.inquiry.delete({
      where: { id: inquiryId }
    });

    console.log(`[INQUIRIES_DELETE] Successfully deleted inquiry: ${inquiryId}`);
    return NextResponse.json(deletedInquiry);
  } catch (error) {
    console.error('[INQUIRIES_DELETE]', error);
    return new NextResponse(`Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

