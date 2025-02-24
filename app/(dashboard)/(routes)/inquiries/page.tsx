import { InquiriesClient } from "./components/client";
import { StatusFilter } from "./components/status-filter";
import prismadb from "@/lib/prismadb";
import { format } from "date-fns";

interface InquiriesPageProps {
  searchParams: {
    status?: string;
    associateId?: string;
  }
}

const InquiriesPage = async ({ searchParams }: InquiriesPageProps) => {
  const associates = await prismadb.associatePartner.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Build the where clause based on search params
  const where = {
    ...(searchParams.associateId && {
      associatePartnerId: searchParams.associateId
    }),
    ...(searchParams.status && {
      status: searchParams.status
    })
  };

  const inquiries = await prismadb.inquiry.findMany({
    where,
    include: {
      location: true,
      associatePartner: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedInquiries = inquiries.map((item) => ({
    id: item.id,
    customerName: item.customerName,
    customerMobileNumber: item.customerMobileNumber,
    location: item.location.label,
    associatePartner: item.associatePartner?.name || 'Direct',
    status: item.status,
    numAdults: item.numAdults,
    numChildren: item.numChildrenAbove11 + item.numChildren5to11 + item.numChildrenBelow5,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Inquiries</h2>
        </div>
      {/*   <div className="flex items-center gap-x-4">
          <StatusFilter />
        </div> */}
        <InquiriesClient 
          data={formattedInquiries} 
          associates={associates}
        />
      </div>
    </div>
  );
}

export default InquiriesPage;
