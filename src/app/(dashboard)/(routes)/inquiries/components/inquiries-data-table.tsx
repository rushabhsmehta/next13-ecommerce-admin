"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter data based on search query across multiple fields
  const filteredData = searchQuery
    ? data.filter((item) => {
        const query = searchQuery.toLowerCase();
        // Search in customer name, mobile number, and location
        return (
          (item.customerName?.toLowerCase()?.includes(query) || false) ||
          (item.customerMobileNumber?.toLowerCase()?.includes(query) || false) ||
          (item.location?.toLowerCase()?.includes(query) || false)
        );
      })
    : data;

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Search name, phone, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <DataTable 
        columns={columns} 
        data={filteredData} 
        searchKey="customerName" 
      />
    </div>
  );
};
