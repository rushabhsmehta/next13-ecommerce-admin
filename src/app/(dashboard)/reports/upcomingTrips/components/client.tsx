"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ApiList } from "@/components/ui/api-list";
import { TourPackageQueryColumn, columns } from "./columns";
import { DataTableMultiple } from "@/components/ui/data-tableMultiple";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  
  const [startDateValue, setStartDateValue] = useState<Date | undefined>(
    startDate ? new Date(startDate) : undefined
  );
  
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(
    endDate ? new Date(endDate) : undefined
  );

  const onDateFilterChange = useCallback(() => {
    const params = new URLSearchParams();
    
    if (startDateValue) {
      params.set('startDate', startDateValue.toISOString().split('T')[0]);
    }
    
    if (endDateValue) {
      params.set('endDate', endDateValue.toISOString().split('T')[0]);
    }
    
    router.push(`/reports/upcomingTrips?${params.toString()}`);
  }, [router, startDateValue, endDateValue]);

  const resetFilters = useCallback(() => {
    setStartDateValue(undefined);
    setEndDateValue(undefined);
    router.push('/reports/upcomingTrips');
  }, [router]);

  return (
    <> 
      <div className="flex items-center justify-between">
        <Heading title={`Upcoming Trips (${data.length})`} description="To filter the queries by assignment, use Search" />
        <Button onClick={() => router.push(`/tourPackageQuery/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      
      <div className="flex items-center space-x-4 mb-4">
        <div className="grid gap-2">
          <div className="flex items-center">
            <span className="mr-2">Start Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !startDateValue && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateValue ? format(startDateValue, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={setStartDateValue}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div className="grid gap-2">
          <div className="flex items-center">
            <span className="mr-2">End Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !endDateValue && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateValue ? format(endDateValue, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={setEndDateValue}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <Button onClick={onDateFilterChange}>Apply Filter</Button>
        <Button variant="outline" onClick={resetFilters}>Reset</Button>
      </div>
      
      <DataTableMultiple searchKeys={["tourPackageQueryNumber", "customerName", "tourPackageQueryName", "assignedTo"]} columns={columns} data={data} />
    </>
  );
};

