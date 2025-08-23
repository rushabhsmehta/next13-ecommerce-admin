"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { InquiryColumn } from "./columns";

interface InquiriesDataTableProps {
  data: InquiryColumn[];
  columns: ColumnDef<InquiryColumn, any>[];
  followUpsOnly?: boolean;
  onToggleFollowUpsOnly?: (checked: boolean) => void;
  isPending?: boolean;
}

export const InquiriesDataTable = ({
  data,
  columns,
  followUpsOnly,
  onToggleFollowUpsOnly,
  isPending
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
        {/* Prominent pill beside the search input for desktop */}
        {typeof onToggleFollowUpsOnly === 'function' && (
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 rounded-full border bg-white flex items-center gap-2">
              <Checkbox id="followups-pill" checked={!!followUpsOnly} onCheckedChange={(v: any) => onToggleFollowUpsOnly(!!v)} />
              <label htmlFor="followups-pill" className="text-sm">Follow-ups only</label>
            </div>
            {isPending && <span className="text-xs text-muted-foreground">Updating…</span>}
          </div>
        )}

      </div>
      
      <DataTable 
        columns={columns} 
        data={filteredData} 
        searchKey="customerName" 
      />
    </div>
  );
};
