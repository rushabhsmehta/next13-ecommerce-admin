import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import prismadb from "@/lib/prismadb";
import { InquiriesClient } from "./components/client";
import { InquiryColumn } from "./components/columns";

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
  const associates = await prismadb.associatePartner.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Get the current date
  const now = new Date();
  
  // Build date range filters based on period
  let dateFilter = {};
  
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
          const startDate = parseISO(searchParams.startDate);
          const endDate = parseISO(searchParams.endDate);
          
          // Set end date to end of day to include the entire day
          endDate.setHours(23, 59, 59, 999);
          
          dateFilter = {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          };
        }
        break;
    }
  }

  // Build the where clause based on search params
  const where = {
    ...(searchParams.associateId && {
      associatePartnerId: searchParams.associateId
    }),
    ...(searchParams.status && searchParams.status !== 'ALL' && {
      status: searchParams.status
    }),
    ...dateFilter
  };

  const inquiries = await prismadb.inquiry.findMany({
    where,
    include: {
      location: true,
      associatePartner: true,
      tourPackageQueries : true,
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
    tourPackageQueries : item.tourPackageQueries|| 'Not specified',
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
        />
      </div>
    </div>
  );
}

export default InquiriesPage;