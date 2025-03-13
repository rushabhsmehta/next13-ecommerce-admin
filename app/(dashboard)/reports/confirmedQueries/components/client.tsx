"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { format, startOfYear, endOfYear } from "date-fns";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { TourPackageQueryColumn, columns } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";

interface TourPackageQueryClientProps {
  data: TourPackageQueryColumn[];
  startDate?: string;
  endDate?: string;
};

export const TourPackageQueryClient: React.FC<TourPackageQueryClientProps> = ({
  data,
  startDate,
  endDate
}) => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize with default values (current year) or provided values
  const [startDateValue, setStartDateValue] = useState<Date | undefined>(
    startDate ? new Date(startDate) : startOfYear(new Date())
  );
  
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(
    endDate ? new Date(endDate) : endOfYear(new Date())
  );

  // Apply filter with current values
  const applyDateFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (startDateValue) {
      params.set('startDate', startDateValue.toISOString().split('T')[0]);
    } else {
      params.delete('startDate');
    }
    
    if (endDateValue) {
      params.set('endDate', endDateValue.toISOString().split('T')[0]);
    } else {
      params.delete('endDate');
    }
    
    router.push(`?${params.toString()}`);
  };

  // Reset to current calendar year
  const clearDateFilter = () => {
    const currentYear = new Date().getFullYear();
    const yearStart = startOfYear(new Date(currentYear, 0, 1));
    const yearEnd = endOfYear(new Date(currentYear, 0, 1));
    
    setStartDateValue(yearStart);
    setEndDateValue(yearEnd);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('startDate', yearStart.toISOString().split('T')[0]);
    params.set('endDate', yearEnd.toISOString().split('T')[0]);
    router.push(`?${params.toString()}`);
  };

  // Initialize filter on first load if no params are present
  useEffect(() => {
    if (!searchParams.has('startDate') && !searchParams.has('endDate')) {
      applyDateFilter();
    }
  }, []);

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Confirmed Tour Package Quaries (${data.length})`} description="To filter the queries by assignment, use Search" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !startDateValue && "text-muted-foreground"
                  )}
                >
                  {startDateValue ? format(startDateValue, "PPP") : "Tour Start From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={setStartDateValue}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !endDateValue && "text-muted-foreground"
                  )}
                >
                  {endDateValue ? format(endDateValue, "PPP") : "Tour Start To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={setEndDateValue}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button onClick={applyDateFilter}>Apply Filter</Button>
            <Button variant="outline" onClick={clearDateFilter}>Reset to Current Year</Button>
          </div>
          
          <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>
      <Separator />
      <DataTableMultiple searchKeys={["tourPackageQueryNumber", "customerName", "tourPackageQueryName", "assignedTo"]} columns={columns} data={data} />
    </>
  );
};
