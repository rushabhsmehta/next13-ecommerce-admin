"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const periodOptions = [
  { value: "ALL", label: "All Time" },
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This Week" },
  { value: "THIS_MONTH", label: "This Month" },
  { value: "LAST_MONTH", label: "Last Month" },
  { value: "CUSTOM", label: "Custom Range" },
];

export const PeriodFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get('period') || 'ALL';
  
  const [fromDate, setFromDate] = useState<Date | undefined>(
    searchParams.get('startDate') ? new Date(searchParams.get('startDate') as string) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    searchParams.get('endDate') ? new Date(searchParams.get('endDate') as string) : undefined
  );

  const onPeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (period === 'ALL') {
      params.delete('period');
      params.delete('startDate');
      params.delete('endDate');
    } else {
      params.set('period', period);
      
      if (period !== 'CUSTOM') {
        params.delete('startDate');
        params.delete('endDate');
      } else if (fromDate && toDate) {
        params.set('startDate', fromDate.toISOString());
        params.set('endDate', toDate.toISOString());
      }
    }

    router.push(`/inquiries?${params.toString()}`);
  };

  const applyDateRange = () => {
    if (!fromDate || !toDate) return;
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'CUSTOM');
    params.set('startDate', fromDate.toISOString());
    params.set('endDate', toDate.toISOString());
    
    router.push(`/inquiries?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-x-2">
      <Select
        value={currentPeriod}
        onValueChange={onPeriodChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by period" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((period) => (
            <SelectItem 
              key={period.value} 
              value={period.value}
            >
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPeriod === 'CUSTOM' && (
        <div className="flex items-center gap-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !fromDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "PPP") : <span>From date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !toDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "PPP") : <span>To date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={applyDateRange}
            disabled={!fromDate || !toDate}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
};

