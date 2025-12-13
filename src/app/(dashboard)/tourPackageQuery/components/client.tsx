"use client";

import { Plus, Sparkles } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
import { PaginationControls } from "@/components/ui/pagination-controls";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data,
  pagination
}) => {
  const params = useParams();
  const router = useRouter();
  const [filteredData, setFilteredData] = useState(data);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [confirmationFilter, setConfirmationFilter] = useState("all");

  // Get unique assigned to values
  const uniqueAssignedTo = Array.from(
    new Set(data.map(item => item.assignedTo))
  ).filter(Boolean).sort();
  // Apply filters whenever filter state changes
  useEffect(() => {
    // Define applyFilters inside useEffect to fix dependency warnings
    const applyFilters = () => {
      console.log(`Applying filters - Assignee: ${assigneeFilter}, Status: ${confirmationFilter}`);

      let result = [...data];

      // Filter by assignee if not "all"
      if (assigneeFilter !== "all") {
        result = result.filter(item => item.assignedTo === assigneeFilter);
      }

      // Filter by confirmation status if not "all"
      if (confirmationFilter !== "all") {
        const isConfirmed = confirmationFilter === "confirmed";
        console.log(`Filtering for isConfirmed=${isConfirmed}`);
        result = result.filter(item => {
          console.log(`Item ${item.tourPackageQueryName}: isFeatured=${item.isFeatured}`);
          return item.isFeatured === isConfirmed;
        });
      }

      console.log(`Filter result: ${result.length} items`);
      setFilteredData(result);
    };

    // Apply filters immediately
    applyFilters();
  }, [assigneeFilter, confirmationFilter, data]);

  const handleAssigneeFilterChange = (value: string) => {
    console.log(`Setting assignee filter to: ${value}`);
    setAssigneeFilter(value);
  };

  const handleConfirmationFilterChange = (value: string) => {
    console.log(`Setting confirmation filter to: ${value}`);
    setConfirmationFilter(value);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title="Tour Package Query" description="Manage tour package Query for your Website" />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/tourPackageQuery/auto`)}
            variant="secondary"
            className="hidden md:flex"
          >
            <Sparkles className="mr-2 h-4 w-4" /> Smart Build
          </Button>
          <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
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

        <Select value={confirmationFilter} onValueChange={handleConfirmationFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Queries</SelectItem>
            <SelectItem value="confirmed">Confirmed Queries</SelectItem>
            <SelectItem value="pending">Pending Queries</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTableMultiple
        searchKeys={["tourPackageQueryNumber", "customerNumber", "customerName", "tourPackageQueryName", "assignedTo"]}
        columns={columns}
        data={filteredData}
        showPagination={!pagination}
      />
      {pagination && (
        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          totalPages={pagination.totalPages}
        />
      )}
    </>
  );
};

