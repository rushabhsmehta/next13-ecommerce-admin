"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { columns, TourPackageQueryColumn } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
}

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();
  const [filteredData, setFilteredData] = useState(data);
  
  // Get unique assigned to values
  const uniqueAssignedTo = Array.from(new Set(data.map(item => item.assignedTo)));

  const handleFilterChange = (value: string) => {
    if (value === "all") {
      setFilteredData(data);
    } else {
      setFilteredData(data.filter(item => item.assignedTo === value));
    }
  };

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Tour Package Query (${filteredData.length})`} description="Manage tour package Query for your Website" />
        <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <div className="my-4">
        <Select onValueChange={handleFilterChange} defaultValue="all">
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {uniqueAssignedTo.map((assignee) => (
              <SelectItem key={assignee} value={assignee}>
                {assignee}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTableMultiple 
        searchKeys={["tourPackageQueryNumber", "customerNumber", "customerName", "tourPackageQueryName", "assignedTo"]} 
        columns={columns} 
        data={filteredData} 
      />
    </>
  );
};
