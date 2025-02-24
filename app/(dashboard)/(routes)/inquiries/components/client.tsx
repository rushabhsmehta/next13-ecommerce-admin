import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useSearchParams } from "next/navigation";
import { InquiryColumn } from "./columns";

interface InquiriesClientProps {
  data: InquiryColumn[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data
}) => {
  const searchParams = useSearchParams();
  const associateId = searchParams.get('associateId');

  const filteredData = associateId 
    ? data.filter((item: InquiryColumn) => item.associatePartner === associateId)
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
