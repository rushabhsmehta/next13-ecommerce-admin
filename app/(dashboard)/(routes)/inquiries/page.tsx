import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { InquiriesClient } from "./components/client";
import { InquiryColumn } from "./components/columns";

interface InquiriesPageProps {
  searchParams: {
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

  const formattedInquiries: InquiryColumn[] = inquiries.map((item) => ({
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
        <InquiriesClient 
          data={formattedInquiries} 
          associates={associates}
        />
      </div>
    </div>
  );
}

export default InquiriesPage;
