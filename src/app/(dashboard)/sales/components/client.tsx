"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";

import { SaleColumn, columns } from "./columns";

interface SalesClientProps {
  data: SaleColumn[];
}

export const SalesClient: React.FC<SalesClientProps> = ({ data }) => {
  const [search, setSearch] = useState("");

  // Filter data based on search input (parent-only; do not pass search text as DataTable searchKey)
  const filteredData = data.filter((item) => {
    if (search === "") return true;

    const searchLower = search.toLowerCase();
    
    // Search across multiple fields
    return (
      item.customerName.toLowerCase().includes(searchLower) ||
      item.packageName.toLowerCase().includes(searchLower) ||
      item.date.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sales..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <DataTable columns={columns} data={filteredData} />
    </>
  );
};

