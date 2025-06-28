"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createColumns } from "./columns";
import type { TourPackageQueryDisplayColumn } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface TourPackageQueryDisplayClientProps {
  data: TourPackageQueryDisplayColumn[];
  readOnly?: boolean;
}

export const TourPackageQueryDisplayClient: React.FC<TourPackageQueryDisplayClientProps> = ({
  data,
  readOnly = false
}) => {
  const params = useParams();
  const router = useRouter();
  const [filteredData, setFilteredData] = useState(data);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  
  // Get unique assigned to values
  const uniqueAssignedTo = Array.from(
    new Set(data.map(item => item.assignedTo))
  ).filter(Boolean).sort();

  // Apply filters whenever filter state changes
  useEffect(() => {
    const applyFilters = () => {
      console.log(`Applying filters - Assignee: ${assigneeFilter}`);
      
      let result = [...data];
      
      // Filter by assignee if not "all"
      if (assigneeFilter !== "all") {
        result = result.filter(item => item.assignedTo === assigneeFilter);
      }
      
      console.log(`Filter result: ${result.length} items`);
      setFilteredData(result);
    };
    
    // Apply filters immediately
    applyFilters();
  }, [assigneeFilter, data]);

  const handleAssigneeFilterChange = (value: string) => {
    console.log(`Setting assignee filter to: ${value}`);
    setAssigneeFilter(value);
  };

  const columns = createColumns(readOnly);

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading 
          title={`Tour Package Query Display (${filteredData.length})`} 
          description={readOnly ? "View tour package queries" : "Manage tour package queries for your Website"} 
        />
      </div>
      <Separator />
      <div className="my-4 flex flex-wrap gap-4">
        <Select value={assigneeFilter} onValueChange={handleAssigneeFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            {uniqueAssignedTo.map((assignee) => (
              <SelectItem key={assignee} value={assignee}>
                {assignee || "Unassigned"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DataTableMultiple 
        searchKeys={["tourPackageQueryNumber", "customerName", "tourPackageQueryName", "assignedTo", "location"]} 
        columns={columns} 
        data={filteredData} 
      />
    </>
  );
};
