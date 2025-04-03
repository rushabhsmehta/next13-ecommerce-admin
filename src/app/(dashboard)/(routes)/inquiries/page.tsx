import { format } from "date-fns";
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

  const associateId = searchParams.associateId;

  // Build the where clause based on search params
  const where = {
    ...(associateId && {
      associatePartnerId: associateId
    }),
    ...(searchParams.status && searchParams.status !== 'ALL' && {
      status: searchParams.status
    }),
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
        />
      </div>
    </div>
  );
}

export default InquiriesPage;
