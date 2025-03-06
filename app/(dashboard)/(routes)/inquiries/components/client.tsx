"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InquiryColumn, columns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useEffect, useState } from "react";

interface InquiriesClientProps {
  data: InquiryColumn[];
  associates: { id: string; name: string }[];
}

export const InquiriesClient: React.FC<InquiriesClientProps> = ({
  data,
  associates
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Initialize date range from URL params if available
  useEffect(() => {
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    
    if (fromDate && toDate) {
      setDateRange({
        from: new Date(fromDate),
        to: new Date(toDate),
      });
    } else if (fromDate) {
      setDateRange({
        from: new Date(fromDate),
        to: undefined,
      });
    } else {
      setDateRange(undefined);
    }
  }, [searchParams]);

  const onAssociateChange = (associateId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (associateId) {
      params.set('associateId', associateId);
    } else {
      params.delete('associateId');
    }
    router.push(`/inquiries?${params.toString()}`);
  };

  const onDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const params = new URLSearchParams(searchParams.toString());
    
    if (range?.from) {
      params.set('fromDate', range.from.toISOString().split('T')[0]);
    } else {
      params.delete('fromDate');
    }
    
    if (range?.to) {
      params.set('toDate', range.to.toISOString().split('T')[0]);
    } else {
      params.delete('toDate');
    }
    
    router.push(`/inquiries?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/inquiries');
  };

  const handleAddNewClick = () => {
    // Open the link in a new tab
    window.open(`/inquiries/new`, '_blank');
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Inquiries (${data.length})`} description="Manage inquiries" />
      
        <div className="flex items-center gap-4">
          <Select
            value={searchParams.get('associateId') || ''}
            onValueChange={onAssociateChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Associate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Associates</SelectItem>
              {associates.map((associate) => (
                <SelectItem key={associate.id} value={associate.id}>
                  {associate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAddNewClick}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <DateRangePicker 
          dateRange={dateRange} 
          onDateRangeChange={onDateRangeChange}
        />
        
        {(searchParams.toString() !== '') && (
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Separator className="my-4" />
      <DataTable searchKey="customerName" columns={columns} data={data} />
    </>
  );
};
