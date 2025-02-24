"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InquiryColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onAssociateChange = (associateId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (associateId) {
      params.set('associateId', associateId);
    } else {
      params.delete('associateId');
    }
    router.push(`/inquiries?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" />
        <Select
          value={searchParams.get('associateId') || ''}
          onValueChange={onAssociateChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Associate" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Associates</SelectItem>
            {associates.map((associate) => (
              <SelectItem key={associate.id} value={associate.id}>
                {associate.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <DataTable searchKey="customerName" columns={columns} data={data} />
    </>
  );
};
