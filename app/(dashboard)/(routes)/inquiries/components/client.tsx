"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"

import { columns, InquiryColumn } from "./columns"

interface InquiriesClientProps {
  data: InquiryColumn[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" />
        <Button onClick={() => router.push(`/inquiries/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="customerName" columns={columns} data={data} />
    </>
  );
};
