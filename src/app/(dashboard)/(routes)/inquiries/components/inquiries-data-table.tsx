"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { InquiryColumn } from "./columns";

interface InquiriesDataTableProps {
  data: InquiryColumn[];
  columns: ColumnDef<InquiryColumn, any>[];
}

export const InquiriesDataTable = ({
  data,
  columns,
}: InquiriesDataTableProps) => {
  return (
    <div>
      <DataTable 
        columns={columns}
        data={data}
        searchKey=""
        enablePagination={false}
      />
    </div>
  );
};
