import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { InquiryColumn, columns } from "./columns";

interface InquiriesClientProps {
  data: InquiryColumn[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({ data }) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Inquiries (${data.length})`}
          description="Manage inquiries for your business"
        />
      </div>
      <Separator />
      <DataTable searchKey="customerName" columns={columns} data={data} />
    </>
  );
};
