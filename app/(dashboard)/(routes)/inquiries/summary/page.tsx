"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SummaryItem {
  status: string;
  _count: {
    id: number;
  };
}

export default function InquirySummaryPage() {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      let url = '/api/inquiries/summary';
      
      // Add date range parameters if available
      if (dateRange?.from || dateRange?.to) {
        const params = new URLSearchParams();
        if (dateRange?.from) {
          params.append('fromDate', dateRange.from.toISOString().split('T')[0]);
        }
        if (dateRange?.to) {
          params.append('toDate', dateRange.to.toISOString().split('T')[0]);
        }
        url = `${url}?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setSummary(data.summary);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [dateRange]);

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Inquiry Summary" description="Overview of all inquiries" />
          
          <div className="flex items-center gap-2">
            <DateRangePicker 
              dateRange={dateRange} 
              onDateRangeChange={setDateRange}
            />
            
            {dateRange && (
              <Button variant="outline" onClick={clearDateFilter}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {summary.map((item) => (
            <Card key={item.status} className="p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm text-muted-foreground">{item.status}</p>
                <p className="text-2xl font-bold">{item._count.id}</p>
              </div>
            </Card>
          ))}
          <Card className="p-4">
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">Total Inquiries</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
