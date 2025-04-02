import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  parseISO
} from "date-fns";
import { headers } from "next/headers";

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
      status,
      journeyDate,
      remarks // Add this to extract remarks from the request
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
        status,
        journeyDate: new Date(journeyDate),
        remarks: remarks || null // Store remarks, default to null if not provided
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
    const headersList = headers();
    const host = headersList.get('host') || '';
    const isAssociateDomain = host === 'associate.aagamholidays.com';

    // Extract query parameters
    let associateId = url.searchParams.get('associateId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const period = url.searchParams.get('period') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // If on associate domain, find the associate by user's email
    if (isAssociateDomain) {
      try {
        const user = await clerkClient.users.getUser(userId);
        if (user && user.emailAddresses && user.emailAddresses.length > 0) {
          const email = user.emailAddresses[0].emailAddress;
          
          // Find associate by email
          const associate = await prismadb.associatePartner.findFirst({
            where: { email }
          });
          
          if (associate) {
            // Override any associateId from the query params
            associateId = associate.id;
          } else {
            // No matching associate found - return empty results
            return NextResponse.json([]);
          }
        }
      } catch (error) {
        console.error("Error identifying associate:", error);
        return NextResponse.json([]);
      }
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
    };

    const inquiries = await prismadb.inquiry.findMany({
      where,
      include: {
        location: true,
        associatePartner: true,
        tourPackageQueries: true,
        actions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
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

