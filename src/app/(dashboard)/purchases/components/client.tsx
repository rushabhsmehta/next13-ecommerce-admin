"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";

import { PurchaseColumn, columns } from "./columns";

interface PurchasesClientProps {
  data: PurchaseColumn[];
}

export const PurchasesClient: React.FC<PurchasesClientProps> = ({ data }) => {
  const router = useRouter();
  const [searchKey, setSearchKey] = useState("");

  // Filter data based on search input
  const filteredData = data.filter((item) => {
    if (searchKey === "") return true;
    
    // Convert all strings to lowercase for case-insensitive search
    const searchLower = searchKey.toLowerCase();
    
    // Search across multiple fields
    return (
      item.supplierName.toLowerCase().includes(searchLower) ||
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
            placeholder="Search purchases..."
            className="pl-8"
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          />
        </div>
      </div>
      <DataTable columns={columns} data={filteredData} searchKey={searchKey} />
    </>
  );
};

