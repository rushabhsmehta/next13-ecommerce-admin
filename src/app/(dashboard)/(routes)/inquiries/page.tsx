import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import prismadb from "@/lib/prismadb";
import { InquiriesClient } from "./components/client";
import { InquiryColumn } from "./components/columns";
import { auth, currentUser } from "@clerk/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface InquiriesPageProps {
  searchParams: {
    associateId?: string;
    status?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }
}

const InquiriesPage = async ({ searchParams }: InquiriesPageProps) => {
  // Check if user is accessing from associate domain
  const headersList = headers();
  const hostname = headersList.get('host') || '';
  const isAssociateDomain = hostname.includes('associate.aagamholidays.com');
  
  // Get the current user from Clerk
  const { userId } = auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || '';
  
  // Fetch organization data
  const organization = await prismadb.organization.findFirst({
    orderBy: {
      createdAt: 'asc'
    }
  });

  const associates = await prismadb.associatePartner.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // If user is on associate domain, find their associate ID
  let associateId = searchParams.associateId;
  let isAssociateUser = false;
  
  if (isAssociateDomain && userEmail) {
    // Try to find the associate by gmail (primary) or email (fallback) field
    const associatePartner = await prismadb.associatePartner.findFirst({
      where: {
        OR: [
          { gmail: userEmail },
          { email: userEmail }
        ]
      }
    });
    
    if (associatePartner) {
      associateId = associatePartner.id;
      isAssociateUser = true;
    } else {
      // If user is on associate domain but email doesn't match any associate's gmail or email,
      // return empty results instead of showing all inquiries
      if (isAssociateDomain) {
        return (
          <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
              <InquiriesClient
                data={[]}
                associates={associates}
                organization={organization}
                isAssociateUser={true}
                accessError="Your email is not associated with any registered associate. Please contact administration."
              />
            </div>
          </div>
        );
      }
    }
  }

  // Build date range filters based on period
  let dateFilter = {};
  const now = new Date();
  
  if (searchParams.period) {
    switch (searchParams.period) {
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
        if (searchParams.startDate && searchParams.endDate) {
          try {
            const parsedStartDate = parseISO(searchParams.startDate);
            const parsedEndDate = parseISO(searchParams.endDate);
            
            // Set end date to end of day to include the entire day
            const endDateWithTime = new Date(parsedEndDate);
            endDateWithTime.setHours(23, 59, 59, 999);
            
            dateFilter = {
              createdAt: {
                gte: parsedStartDate,
                lte: endDateWithTime
              }
            };
          } catch (error) {
            console.error("Invalid date format:", error);
          }
        }
        break;
    }
  }

  // Build the where clause based on search params
  const where = {
    ...(associateId && {
      associatePartnerId: associateId
    }),
    ...(searchParams.status && searchParams.status !== 'ALL' && {
      status: searchParams.status
    }),
    ...dateFilter  // Add the date filter to the where clause
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

  const formattedInquiries: InquiryColumn[] = inquiries.map((item) => ({
    id: item.id,
    customerName: item.customerName,
    customerMobileNumber: item.customerMobileNumber,
    location: item.location.label,
    associatePartner: item.associatePartner?.name || 'Direct',
    status: item.status,
    journeyDate: item.journeyDate ? format(new Date(item.journeyDate), 'dd MMM yyyy') : 'No date',
    tourPackageQueries: item.tourPackageQueries || 'Not specified',
    actionHistory: item.actions?.map(action => ({
      status: action.actionType,
      remarks: action.remarks,
      timestamp: format(new Date(action.actionDate), 'dd MMM yyyy HH:mm'),
      type: action.actionType
    })) || []
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InquiriesClient
          data={formattedInquiries}
          associates={associates}
          organization={organization}
          isAssociateUser={isAssociateUser}
        />
      </div>
    </div>
  );
}

export default InquiriesPage;
