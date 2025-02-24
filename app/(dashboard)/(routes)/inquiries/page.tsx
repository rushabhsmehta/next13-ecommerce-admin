"use client";

import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { InquiryColumn } from "./components/columns";

interface InquiriesClientProps {
  data: any[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data
}) => {
  const searchParams = useSearchParams();
  const associateId = searchParams.get('associateId');

  // Filter inquiries if associateId is provided
  const filteredData = associateId 
    ? data.filter(item => item.associatePartnerId === associateId)
    : data;

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading 
          title={`Inquiries ${associateId ? 'for Selected Associate' : ''}`}
          description="Manage inquiries"
        />
      </div>
      <Separator />
      <DataTable data={filteredData} searchKey="customerName" columns={[]} />
    </>
  );
};

const InquiriesPage = async () => {
  const inquiries = await prismadb.inquiry.findMany({
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
        <InquiriesClient data={formattedInquiries} />
      </div>
    </div>
  );
}

export default InquiriesPage;
